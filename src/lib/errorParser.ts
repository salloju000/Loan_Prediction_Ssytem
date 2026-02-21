/**
 * lib/errorParser.ts
 *
 * Normalises FastAPI / Pydantic error responses into a flat map of
 * { fieldErrors, globalErrors } that the form layer can consume directly.
 *
 * Extracted from App.tsx to keep the root component focused on orchestration.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Map of form field name → human-readable error message.
 * Passed down to EnterDetails so each input can show an inline error.
 */
export type FieldErrors = Record<string, string>

// ── Backend → Frontend field name mapping ─────────────────────────────────────

/**
 * Maps backend field names (snake_case) to frontend FormData keys (camelCase).
 * Add entries here whenever a new field is added to the form.
 */
const BACKEND_TO_FORM_FIELD: Record<string, string> = {
  age: 'age',
  credit_score: 'creditScore',
  monthly_income: 'applicantIncome',
  coapplicant_income: 'coapplicantIncome',
  loan_amount_requested: 'loanAmount',
  loan_tenure_months: 'loanTenure',
  existing_emis: 'existingEmis',
  existing_loans_count: 'existingLoansCount',
  dependents: 'dependents',
  years_of_experience: 'yearsOfExperience',
  gender: 'gender',
  marital_status: 'maritalStatus',
  education: 'education',
  employment_type: 'employmentType',
  property_area: 'propertyArea',
  loan_type: 'loanType',
  property_value: 'propertyValue',
  vehicle_price: 'vehiclePrice',
  vehicle_age_years: 'vehicleAgeYears',
  course_type: 'courseType',
  institution_tier: 'institutionTier',
}

// ── Error parsing ─────────────────────────────────────────────────────────────

/**
 * Pydantic 422 errors arrive as:
 *   { detail: [ { loc: ["body", "age"], msg: "...", type: "..." }, ... ] }
 * OR our custom predictor errors:
 *   { detail: { message: "...", errors: ["Missing field: 'age'", ...] } }
 * OR a plain string detail.
 *
 * This function normalises all three shapes into:
 *   { fieldErrors: { age: "Age must be between 18 and 70" },
 *     globalErrors: ["some error not tied to a field"] }
 */
export const parseApiErrors = (
  detail: unknown,
): { fieldErrors: FieldErrors; globalErrors: string[] } => {
  const fieldErrors: FieldErrors = {}
  const globalErrors: string[] = []

  if (!detail) return { fieldErrors, globalErrors }

  // ── Shape 1: Pydantic validation errors array ─────────────────────────────
  if (Array.isArray(detail)) {
    for (const item of detail as Array<{ loc?: string[]; msg?: string }>) {
      const msg = item.msg ?? 'Invalid value'
      const rawField = item.loc?.slice(1).join('.') ?? ''
      const formField = BACKEND_TO_FORM_FIELD[rawField] ?? rawField

      if (formField) {
        fieldErrors[formField] = sanitisePydanticMessage(msg, formField)
      } else {
        globalErrors.push(msg)
      }
    }
    return { fieldErrors, globalErrors }
  }

  // ── Shape 2: Custom predictor error object ────────────────────────────────
  if (typeof detail === 'object' && detail !== null) {
    const d = detail as { message?: string; errors?: string[] }
    const errorList = d.errors ?? []

    for (const raw of errorList) {
      const matched = matchFieldError(raw)
      if (matched) {
        fieldErrors[matched.field] = matched.message
      } else {
        globalErrors.push(raw)
      }
    }

    if (d.message && errorList.length === 0) {
      globalErrors.push(d.message)
    }
    return { fieldErrors, globalErrors }
  }

  // ── Shape 3: Plain string ─────────────────────────────────────────────────
  if (typeof detail === 'string') {
    globalErrors.push(detail)
  }

  return { fieldErrors, globalErrors }
}

/**
 * Attempts to extract a field name from a predictor error string like:
 *   "Missing required field: 'age'"
 *   "'age' must be between 18 and 70, got 55555"
 *   "'credit_score' must be one of [...], got 'abc'"
 */
const matchFieldError = (msg: string): { field: string; message: string } | null => {
  const patterns = [
    /^['"'"](\w+)['"'"]\s+(.+)$/,
    /^Missing required field:\s*['"'"](\w+)['"'"]$/,
    /^['"'"](\w+)['"'"] is required/,
  ]
  for (const re of patterns) {
    const match = msg.match(re)
    if (match) {
      const backendField = match[1]
      const formField = BACKEND_TO_FORM_FIELD[backendField] ?? backendField
      return { field: formField, message: formatFieldMessage(msg, backendField) }
    }
  }
  return null
}

/** Makes Pydantic's verbose messages more user-friendly. */
const sanitisePydanticMessage = (msg: string, field: string): string => {
  const label = fieldLabel(field)
  if (msg.includes('greater than or equal to')) return `${label} is too low`
  if (msg.includes('less than or equal to')) return `${label} is too high`
  if (msg.includes('at least')) return `${label} is required`
  if (msg.includes('not a valid')) return `${label} has an invalid value`
  if (msg.includes('none is not allowed')) return `${label} is required`
  return msg.charAt(0).toUpperCase() + msg.slice(1)
}

/** Cleans predictor error strings like "'age' must be between 18 and 70, got 55555" */
const formatFieldMessage = (raw: string, backendField: string): string => {
  const withoutField = raw
    .replace(new RegExp(`^['"']?${backendField}['"']?\\s*`), '')
    .trim()
  return withoutField.charAt(0).toUpperCase() + withoutField.slice(1)
}

/**
 * Converts a camelCase or snake_case form field key into a readable label.
 * Used in error messages as fallback when we can't produce a bespoke message.
 */
const fieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    age: 'Age',
    creditScore: 'Credit score',
    applicantIncome: 'Monthly income',
    coapplicantIncome: 'Co-applicant income',
    loanAmount: 'Loan amount',
    loanTenure: 'Loan tenure',
    existingEmis: 'Existing EMIs',
    existingLoansCount: 'Existing loans count',
    dependents: 'Dependents',
    yearsOfExperience: 'Years of experience',
    propertyValue: 'Property value',
    vehiclePrice: 'Vehicle price',
    vehicleAgeYears: 'Vehicle age',
  }
  return labels[field] ?? field.replace(/([A-Z])/g, ' $1').trim()
}
