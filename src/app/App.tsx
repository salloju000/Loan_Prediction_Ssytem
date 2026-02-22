/**
 * src/app/App.tsx
 *
 * Root application component.
 * - Multi-step wizard: Loan Type → Details → Results
 * - Persists state to localStorage (version-guarded)
 * - Falls back to a mock result when the backend is offline
 * - All monetary values formatted with Indian locale (₹1,00,000 style)
 * - Full validation error display: toast summary + per-field inline errors
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '../components/ThemeProvider'
import { SEO } from '../components/ui/SEO'
import { ErrorBoundary } from '../components/pages/ErrorBoundary'
import { Header } from '../components/pages/Header'
import { ProgressSteps } from '../components/pages/ProgressSteps'
import { LoanTypeSelection } from '../components/pages/LoanTypeSelection'
import { EnterDetails } from '../components/pages/EnterDetails'
import { Results } from '../components/pages/Results'
import { Button } from '../components/ui/button'
import { History } from '../components/pages/History'
import { RotateCcw } from 'lucide-react'
import { banksByLoanType, LOAN_CONFIG } from '../lib/constants'
import type { FormData, HistoryItem, LoanPredictResponse, LoanTypeId, CurrencyCode, LoanConfig } from '../lib/types'
import { initialFormState } from '../lib/types'
import { getBanksByLoanType, createEligibilityRequestPayload, resolveConfig, parseFormNumber } from '../lib/utils'
import { predictLoanEligibility, ApiRequestError, checkHealth } from '../lib/api'
import { buildMockResult, isValidResult } from '../lib/mockBuilder'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Bump when LoanPredictResponse shape changes to invalidate stale cache. */
const STORAGE_VERSION = 'v2'

const OFFLINE_DELAY_MS = 1_200       // Simulated latency for mock mode
const SCROLL_DEBOUNCE_MS = 100

/** Indian locale formatter — produces ₹1,00,000 style values. */
const inrFormat = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`

const LS_KEYS = {
  version: 'loanApp_version',
  formData: 'loanApp_formData',
  result: 'loanApp_result',
  history: 'loanApp_history',
  currency: 'loanApp_currency',
} as const

type LSKey = typeof LS_KEYS[keyof typeof LS_KEYS]

// ─────────────────────────────────────────────────────────────────────────────
// SAFE LOCALSTORAGE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

const LS = {
  get: (key: LSKey): string | null => {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set: (key: LSKey, value: string): void => {
    try { localStorage.setItem(key, value) } catch { /* quota exceeded — silently skip */ }
  },
  remove: (...keys: LSKey[]): void => {
    try { keys.forEach(k => localStorage.removeItem(k)) } catch { }
  },
}

const clearAppStorage = (): void => {
  LS.remove(LS_KEYS.formData, LS_KEYS.result)
  LS.set(LS_KEYS.version, STORAGE_VERSION)
}

// ─────────────────────────────────────────────────────────────────────────────
// APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<LoanPredictResponse | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [formData, setFormData] = useState<FormData>(initialFormState)
  const [currency, setCurrency] = useState<CurrencyCode>('INR')
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Restore persisted state (version-guarded) ─────────────────────────────
  useEffect(() => {
    const storedVersion = LS.get(LS_KEYS.version)
    if (storedVersion !== STORAGE_VERSION) {
      clearAppStorage()
      return
    }
    try {
      const rawFormData = LS.get(LS_KEYS.formData)
      const rawResult = LS.get(LS_KEYS.result)

      if (rawFormData) {
        setFormData(JSON.parse(rawFormData) as FormData)
      }

      if (rawResult) {
        const parsed = JSON.parse(rawResult) as unknown
        if (isValidResult(parsed)) {
          setResult(parsed)
        } else {
          LS.remove(LS_KEYS.result)
        }
      }

      const rawHistory = LS.get(LS_KEYS.history)
      if (rawHistory) {
        setHistory(JSON.parse(rawHistory) as HistoryItem[])
      }

      const rawCurrency = LS.get(LS_KEYS.currency)
      if (rawCurrency) {
        setCurrency(rawCurrency as CurrencyCode)
      }
    } catch {
      clearAppStorage()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Backend health probe ──────────────────────────────────────────────────
  const retryHealthCheck = useCallback(() => {
    setBackendOnline(null)
    checkHealth()
      .then(h => {
        setBackendOnline(h.model_loaded)
        if (h.model_loaded) toast.success('Backend connected successfully!')
      })
      .catch(() => {
        setBackendOnline(false)
        toast.error('Could not reach backend. Is it running?')
      })
  }, [])

  useEffect(() => {
    retryHealthCheck()
  }, [retryHealthCheck])

  // ── Scroll to top on route change ─────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(
      () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      SCROLL_DEBOUNCE_MS,
    )
    return () => clearTimeout(id)
  }, [location.pathname])

  useEffect(() => { LS.set(LS_KEYS.version, STORAGE_VERSION) }, [])
  useEffect(() => { LS.set(LS_KEYS.formData, JSON.stringify(formData)) }, [formData])
  useEffect(() => { LS.set(LS_KEYS.result, JSON.stringify(result)) }, [result])
  useEffect(() => { LS.set(LS_KEYS.currency, currency) }, [currency])


  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLoanTypeSelect = useCallback((id: LoanTypeId) => {
    setFormData(prev => ({ ...prev, loanType: id }))
    navigate(`/details/${id}`)
  }, [navigate])

  const handleFormChange = useCallback((data: FormData) => {
    setFormData(data)
  }, [])

  const handleBack = useCallback(() => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    navigate(-1)
  }, [navigate, isLoading])

  const handleFormSubmit = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    navigate('/results')

    try {
      const payload = createEligibilityRequestPayload(formData, formData.loanType)
      let prediction: LoanPredictResponse

      if (backendOnline) {
        prediction = await predictLoanEligibility(payload, controller.signal)
      } else {
        await new Promise<void>(resolve => setTimeout(resolve, OFFLINE_DELAY_MS))
        prediction = buildMockResult(formData)
        toast.warning('Backend offline — showing estimated result', { duration: 5_000 })
      }

      if (!isValidResult(prediction)) {
        throw new Error(`Unexpected response shape from server`)
      }

      setResult(prediction)

      const hItem: HistoryItem = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        date: new Date().toISOString(),
        loanType: (formData.loanType as LoanTypeId) || 'generic',
        currency,
        formData: { ...formData },
        result: prediction
      }
      setHistory(prev => {
        const next = [hItem, ...prev].slice(0, 20)
        LS.set(LS_KEYS.history, JSON.stringify(next))
        return next
      })

      if (prediction.approved) {
        toast.success(
          `Approved! ${inrFormat(prediction.sanctioned_amount)} sanctioned.`
        )
      } else {
        toast.error('Not approved — see detailed reasons on the results page.')
      }

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof ApiRequestError && err.message.toLowerCase().includes('aborted')) return

      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [formData, backendOnline, currency, navigate])

  const resetForm = useCallback(() => {
    setResult(null)
    setFormData(initialFormState)
    clearAppStorage()
    LS.set(LS_KEYS.version, STORAGE_VERSION)
    navigate('/select-loan')
  }, [navigate])

  const handleViewHistoryItem = useCallback((item: HistoryItem) => {
    setFormData(item.formData)
    setResult(item.result)
    setCurrency(item.currency)
    navigate('/results')
  }, [navigate])

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      LS.set(LS_KEYS.history, JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      setHistory([])
      LS.remove(LS_KEYS.history)
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <HelmetProvider>
      <ThemeProvider defaultTheme="system" storageKey="loan-site-theme">
        <ErrorBoundary>
          <div className="min-h-screen bg-background">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
            >
              Skip to main content
            </a>

            {backendOnline === false && location.pathname === '/details' && (
              <div
                role="alert"
                aria-live="polite"
                className="bg-muted border-b border-border px-4 py-2 text-center text-xs text-foreground flex items-center justify-center gap-3"
              >
                <span>
                  ⚠️ Backend offline — results will be estimated. Start it with:{' '}
                  <code className="font-mono bg-background px-1 rounded">
                    cd backend &amp;&amp; uvicorn main:app --reload
                  </code>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryHealthCheck}
                  className="h-7 px-3 text-[10px] bg-background border-border hover:bg-accent"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry Connection
                </Button>
              </div>
            )}

            <Header
              onLogoClick={resetForm}
              currency={currency}
              onCurrencyChange={setCurrency}
            />

            <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" tabIndex={-1}>
              <ProgressSteps
                currentStep={
                  location.pathname === '/select-loan' ? 1 :
                    location.pathname === '/details' ? 2 : 3
                }
              />

              <Routes>
                <Route path="/select-loan" element={
                  <>
                    <SEO title="Select Loan Type" description="Pick the perfect loan for your needs." />
                    <LoanTypeSelection onSelectLoan={handleLoanTypeSelect} />
                  </>
                } />

                <Route path="/details/:loanType?" element={
                  <>
                    <SEO title={`${resolveConfig(formData.loanType).name} Details`} description="Complete your loan application." />
                    <EnterDetails
                      formData={formData}
                      onFormChange={handleFormChange}
                      onBack={handleBack}
                      onSubmit={handleFormSubmit}
                      isLoading={isLoading}
                      selectedLoanType={formData.loanType}
                      currency={currency}
                      onReset={resetForm}
                    />
                  </>
                } />

                <Route path="/results" element={
                  (isValidResult(result) || isLoading) ? (
                    <>
                      <SEO title="Eligibility Results" description="View your detailed results." />
                      <Results
                        result={result!}
                        loanType={formData.loanType}
                        selectedTenure={parseFormNumber(formData.loanTenure) || 5}
                        interestRate={
                          parseFormNumber(formData.customInterestRate) ||
                          (LOAN_CONFIG as Record<string, LoanConfig>)[formData.loanType]?.defaultRate ||
                          8.5
                        }
                        suggestedBanks={getBanksByLoanType(banksByLoanType, formData.loanType) ?? []}
                        onBack={handleBack}
                        onReset={resetForm}
                        isLoading={isLoading}
                        currency={currency}
                        formData={formData}
                      />
                    </>
                  ) : (
                    <Navigate to="/select-loan" replace />
                  )
                } />

                <Route path="/history" element={
                  <>
                    <SEO title="Application History" description="Manage your past predicts." />
                    <History
                      history={history}
                      onViewDetails={handleViewHistoryItem}
                      onDelete={handleDeleteHistoryItem}
                      onClear={handleClearHistory}
                    />
                  </>
                } />

                <Route path="*" element={<Navigate to="/select-loan" replace />} />
              </Routes>
            </main>
          </div>
          <Toaster richColors position="top-right" />
          <Analytics />
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App