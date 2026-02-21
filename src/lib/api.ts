/**
 * api.ts — Typed HTTP client for the Loan Prediction backend
 *
 * All network requests from the frontend go through this file.
 * It provides a clean, type-safe interface for:
 *   1. Health checking the FastAPI backend
 *   2. Sending loan eligibility prediction requests
 *
 * Architecture:
 *   apiFetch<T>()            — generic fetch wrapper (handles errors + JSON)
 *   ApiRequestError          — custom Error subclass with statusCode + field errors
 *   checkHealth()            — GET /health → tells us if the ML model is loaded
 *   predictLoanEligibility() — POST /predict → returns LoanPredictResponse
 *
 * Base URL:
 *   Defaults to http://localhost:8000 (the FastAPI dev server).
 *   Override by setting VITE_API_URL in a .env file:
 *     VITE_API_URL=https://your-production-api.com
 *
 * Production improvements over original:
 *  - `any` removed from apiFetch body, Pydantic detail map, and
 *    predictLoanEligibility payload → properly typed throughout
 *  - apiFetch is now an AbortSignal-aware: accepts optional signal so
 *    callers can cancel in-flight requests on unmount / route change
 *  - Request timeout: apiFetch wraps every call in a 30s AbortController
 *    timeout — prevents hanging requests if the backend stops responding
 *  - HTTPS enforcement in production: warns (dev) or throws (prod) if
 *    BASE_URL is plain http:// in a non-localhost context
 *  - checkHealth return type tightened to a named interface
 *  - predictLoanEligibility payload typed as LoanSubmitPayload (imported
 *    from types) instead of Record<string, any>
 *  - Pydantic loc array guard: handles edge cases where loc is undefined
 *  - Network error (fetch throws before response): caught and re-thrown
 *    as ApiRequestError with statusCode 0 so callers can distinguish
 *    "no connection" from HTTP errors
 *  - ApiRequestError.isNetworkError() convenience getter added
 *  - No implicit `any` anywhere
 */

import type { LoanPredictResponse, LoanSubmitPayload } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

const REQUEST_TIMEOUT_MS = 30_000   // 30 seconds

// Warn in dev, throw in prod if pointing at plain http:// on a non-localhost host
const isLocalhost = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')
if (!isLocalhost && BASE_URL.startsWith('http://')) {
  const msg = `[api] VITE_API_URL "${BASE_URL}" uses plain HTTP on a non-localhost host. Use HTTPS in production.`
  if (import.meta.env.DEV) {
    console.warn(msg)
  } else {
    throw new Error(msg)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of a single Pydantic validation error entry. */
interface PydanticErrorDetail {
  loc?: (string | number)[]
  msg: string
  type?: string
}

/** Custom backend error format: { message, errors } */
interface BackendErrorDetail {
  message?: string
  errors?: string[]
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  model_loaded: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Error subclass thrown by apiFetch on any HTTP or network failure.
 *
 * statusCode === 0  → network error (no connection, DNS failure, CORS, timeout)
 * statusCode === 422 → Pydantic / application validation error
 * statusCode === 503 → model not loaded
 * statusCode === 500 → internal server error
 *
 * Usage:
 *   } catch (err) {
 *     if (err instanceof ApiRequestError) {
 *       if (err.isNetworkError) toast.error('Cannot reach server')
 *       if (err.statusCode === 422) setFieldErrors(err.errors)
 *       if (err.statusCode === 503) toast.error('Model not loaded')
 *     }
 *   }
 */
export class ApiRequestError extends Error {
  readonly statusCode: number
  readonly errors: string[]

  constructor(message: string, statusCode: number, errors: string[] = []) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
    this.errors = errors
    // Maintains correct prototype chain for `instanceof` checks in transpiled ES5
    Object.setPrototypeOf(this, ApiRequestError.prototype)
  }

  /** True when the request never reached the server (offline, timeout, CORS). */
  get isNetworkError(): boolean {
    return this.statusCode === 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC FETCH WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps fetch with:
 *  - Automatic JSON Content-Type header
 *  - 30-second request timeout (configurable via REQUEST_TIMEOUT_MS)
 *  - Structured error normalisation into ApiRequestError
 *  - Network-level error catching (throws with statusCode 0)
 *
 * @param endpoint — path relative to BASE_URL (e.g. '/health', '/predict')
 * @param options  — standard RequestInit; signal is merged with timeout signal
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // ── Timeout controller ─────────────────────────────────────────────────
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  )

  // Merge caller-provided signal with our timeout signal
  const callerSignal = options.signal as AbortSignal | undefined
  let signal: AbortSignal = timeoutController.signal

  if (callerSignal) {
    // If the caller also has a signal, abort when either fires
    const merged = new AbortController()
    const onAbort = () => merged.abort()
    timeoutController.signal.addEventListener('abort', onAbort, { once: true })
    callerSignal.addEventListener('abort', onAbort, { once: true })
    signal = merged.signal
  }

  // ── Fetch ──────────────────────────────────────────────────────────────
  let response: Response

  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (err) {
    clearTimeout(timeoutId)
    // AbortError from our timeout controller → surface as timeout message
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        0,
      )
    }
    // All other network errors (offline, DNS, CORS)
    throw new ApiRequestError(
      err instanceof Error ? err.message : 'Network error',
      0,
    )
  } finally {
    clearTimeout(timeoutId)
  }

  // ── Parse body ─────────────────────────────────────────────────────────
  // Parse BEFORE checking response.ok — FastAPI returns JSON error bodies
  // on 4xx/5xx responses too.
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiRequestError(
      'Server returned an unreadable response',
      response.status,
    )
  }

  // ── Error normalisation ────────────────────────────────────────────────
  if (!response.ok) {
    const detail = (body as Record<string, unknown>)?.detail

    // Pydantic validation error: detail is an array of { loc, msg, type }
    if (Array.isArray(detail)) {
      const messages = (detail as PydanticErrorDetail[]).map(d => {
        const field = d.loc ? d.loc.slice(1).join('.') : 'field'
        return `${field} — ${d.msg}`
      })
      throw new ApiRequestError(messages.join('; '), response.status, messages)
    }

    // Custom backend error: detail is { message, errors }
    if (detail !== null && typeof detail === 'object') {
      const d = detail as BackendErrorDetail
      throw new ApiRequestError(
        d.message ?? 'Request failed',
        response.status,
        d.errors ?? [],
      )
    }

    // Plain string detail or unknown shape
    throw new ApiRequestError(
      typeof detail === 'string' ? detail : 'Request failed',
      response.status,
    )
  }

  return body as T
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /health — Ping the backend to check if it's running and the ML
 * model is loaded.
 *
 * Called once on app startup to decide between real ML predictions
 * and the offline `buildMockResult()` fallback.
 *
 *   model_loaded: true  → ready for predictions
 *   model_loaded: false → server up but model failed to load (show warning)
 *   throws              → server unreachable (use offline mode)
 */
export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}

/**
 * POST /predict — Send applicant data to the ML model and receive a prediction.
 *
 * The payload is built by `createEligibilityRequestPayload()` in utils.ts,
 * which maps form field names to the snake_case keys the backend expects.
 *
 * Success → LoanPredictResponse with:
 *   approved             — boolean approval decision
 *   approval_probability — confidence % (0–100)
 *   loan_grade           — letter grade (A+ to E)
 *   sanctioned_amount    — amount the bank would approve
 *   rejection_reasons    — reasons if not approved
 *   breakdown            — detailed financial health analysis
 *
 * Failure → ApiRequestError:
 *   statusCode 0   → network error / timeout
 *   statusCode 422 → validation error (bad field values)
 *   statusCode 503 → model not loaded (restart uvicorn)
 *   statusCode 500 → internal model inference error
 *
 * @param payload — typed payload from createEligibilityRequestPayload()
 * @param signal  — optional AbortSignal for request cancellation on unmount
 */
export async function predictLoanEligibility(
  payload: LoanSubmitPayload,
  signal?: AbortSignal,
): Promise<LoanPredictResponse> {
  return apiFetch<LoanPredictResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...(signal ? { signal } : {}),
  })
}