/**
 * types.ts — Shared TypeScript type definitions
 *
 * Single source of truth for all data shapes used across the frontend.
 * Both components and the API layer import from here.
 *
 * Sections:
 *  1.  LoanTypeId          — union type for valid loan type identifiers
 *  2.  FormData            — user-input state shared across all form steps
 *  3.  FormErrors          — field-level validation error messages
 *  4.  LoanType            — metadata for a loan product (UI cards)
 *  5.  Bank                — a bank recommendation shown on the Results page
 *  6.  Model response      — mirrors the FastAPI /predict response exactly
 *  7.  LoanSubmitPayload   — POST body sent to /predict
 *  8.  ApiError            — error shape returned by the backend on failure
 *  9.  initialFormState    — empty/default form values used on reset
 *  10. loanSpecificRequiredFields — per-loan-type required field lists
 *  11. hasLoanSpecificData — type guard for loan-specific field completion
 */

import type { ReactNode } from 'react'

// ── 1. LoanTypeId ─────────────────────────────────────────────────────────────
/**
 * Union of all valid loan type identifiers.
 * Use this instead of `string` wherever a loan type is expected so that
 * TypeScript catches typos and unhandled cases at compile time.
 */
export type LoanTypeId =
  | 'car'
  | 'bike'
  | 'home'
  | 'education'
  | 'personal'
  | 'generic'

// ── 1.1 CurrencyCode ────────────────────────────────────────────────────────
/** Supported currencies for multi-currency display. */
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP'


// ── 2. FormData ───────────────────────────────────────────────────────────────
/**
 * Complete set of form fields collected across all loan types.
 *
 * Design decisions:
 *  - Numeric fields are `string` (not `string | number`) because HTML inputs
 *    always produce strings and storing raw digit strings makes Indian-locale
 *    formatting straightforward. Conversion to number happens at submit time.
 *  - Loan-type-specific fields are optional (`?`) — they only appear and are
 *    validated when the matching loan type is selected.
 *  - `loanTenure` stays `number` because it comes from a Slider (not a text input).
 */
export interface FormData {
  // ── Applicant profile ────────────────────────────────────────────────────
  loanType:           LoanTypeId | ''
  gender:             'Male' | 'Female' | ''
  age:                string
  yearsOfExperience:  string
  employmentType:     string
  maritalStatus:      string
  education:          string
  dependents:         string        // '0' | '1' | '2' | '3' | '4+'
  propertyArea:       string        // 'Urban' | 'Semi-Urban' | 'Rural'

  // ── Financials ────────────────────────────────────────────────────────────
  applicantIncome:    string        // raw digits, formatted in UI as ₹X,XX,XXX
  coapplicantIncome:  string
  creditScore:        string        // 300–900
  existingEmis:       string
  existingLoansCount: string        // '0' | '1' | '2' | '3' | '4'

  // ── Loan request ──────────────────────────────────────────────────────────
  loanAmount:         string
  loanTenure:         number        // years — comes from Slider, always a number
  customInterestRate: string        // decimal string e.g. '8.5'; '' = use default

  // ── Car loan ──────────────────────────────────────────────────────────────
  carType?:           string        // 'new' | 'used'
  carPrice?:          string
  carAge?:            string        // only relevant when carType === 'used'

  // ── Bike loan ─────────────────────────────────────────────────────────────
  bikeType?:          string        // 'new' | 'used'
  bikePrice?:         string
  bikeAge?:           string

  // ── Home loan ─────────────────────────────────────────────────────────────
  propertyType?:      string        // 'flat' | 'villa' | 'plot' | 'commercial'
  propertyValue?:     string

  // ── Education loan ────────────────────────────────────────────────────────
  courseType?:        string        // 'Engineering' | 'Medical' | 'MBA' | etc.
  institutionTier?:   string        // 'Tier-1' | 'Tier-2' | 'Tier-3'
  studyLocation?:     string        // 'india' | 'abroad'
  courseDuration?:    string

  // ── Shared (vehicle & home) ───────────────────────────────────────────────
  downPayment?:       string
}

// ── 3. FormErrors ─────────────────────────────────────────────────────────────
/**
 * Field-level validation error messages.
 * Keys match FormData field names; values are human-readable strings.
 * An empty object `{}` means the form is valid.
 */
export type FormErrors = Record<string, string>

// ── 4. LoanType ───────────────────────────────────────────────────────────────
/**
 * Metadata for a single loan product displayed on the selection screen.
 * These objects live in constants.tsx and are rendered as cards.
 */
export interface LoanType {
  id:                     LoanTypeId
  name:                   string       // 'Car Loan', 'Home Loan', etc.
  description:            string       // short marketing copy
  icon:                   ReactNode    // Lucide icon rendered on the card
  rateRange:              string       // e.g. '8.5% – 14%' (informational only)
  maxAmount:              number       // maximum loan amount in ₹
  maxTenure:              number       // maximum repayment period in years
  defaultRate:            number       // pre-filled interest rate (user can override)
  requiresSpecificFields: boolean      // whether step 2 shows loan-specific fields
}

/** Configuration metadata for a loan type (used in forms). */
export interface LoanConfig {
  name:        string
  icon:        React.ComponentType<{ className?: string }>
  maxLoan:     number
  maxTenure:   number
  defaultRate: number
}

// ── 5. Bank ───────────────────────────────────────────────────────────────────
/**
 * A single bank recommendation shown on the Results page.
 * Data comes from banksByLoanType in constants.tsx — static, not from the API.
 */
export interface Bank {
  name:          string    // 'HDFC Bank'
  rate:          number    // annual interest rate (%)
  maxAmount:     number    // maximum loan amount this bank offers (₹)
  processingFee: string    // '0.5%' or 'Nil'
  rating:        number    // star rating (1–5)
}

// ── 6. Model response types ───────────────────────────────────────────────────
// These interfaces mirror the Pydantic schemas in backend/schemas.py exactly.
// If the backend schema changes, update these to match.

/** Monthly financial health analysis returned by the ML model. */
export interface FinancialHealth {
  total_monthly_income:  string   // '₹75,000'
  existing_monthly_emis: string
  projected_new_emi:     string   // EMI if this loan is approved
  free_monthly_income:   string   // income remaining after all EMIs
  debt_to_income_ratio:  string   // '42.50%'
  emi_to_income_ratio:   string   // new EMI as % of total income
}

/** Credit health summary returned by the predictor. */
export interface CreditProfile {
  credit_score:      number    // raw CIBIL score (300–900)
  credit_score_band: string    // 'Exceptional' | 'Very Good' | 'Good' | 'Fair' | 'Poor' | 'Very Poor'
  existing_loans:    number    // count of active loans
  is_high_risk_flag: boolean   // true if DTI > 60% AND credit_score < 650
}

/** Loan-specific metrics used in the results breakdown panel. */
export interface LoanMetrics {
  amount_requested:        string   // formatted loan amount
  tenure:                  string   // '240 months (20 yrs 0 mo)'
  tenure_months?:          number   // numeric tenure used by EmiBreakdown
  interest_rate?:          number   // annual rate (%) — set by mock builder and backend
  loan_to_income_ratio:    string   // '5.3x'
  sanctioned_amount:       string   // '₹35,20,000' or 'N/A'
  monthly_emi_if_approved: string   // '₹28,500' or 'N/A'
}

/** Full breakdown object nested inside LoanPredictResponse. */
export interface Breakdown {
  financial_health:    FinancialHealth
  credit_profile:      CreditProfile
  loan_metrics:        LoanMetrics
  approval_confidence: string   // '72.5%'
}

/**
 * Main response shape from POST /predict.
 *
 * `status` is 'success' for real predictions or 'mock' for offline estimates.
 * The Results component checks `status === 'mock'` to show an offline banner.
 *
 * Matches backend/schemas.py › LoanPredictResponse exactly.
 */
export interface LoanPredictResponse {
  status:                'success' | 'mock'
  loan_type:             string
  applicant_name:        string
  approved:              boolean
  approval_probability:  number      // 0–100
  loan_grade:            string      // 'A+ (Excellent)' … 'E  (High Risk)'
  loan_amount_requested: number
  sanctioned_amount:     number      // 0 if rejected
  sanction_ratio:        number      // sanctioned / requested × 100 (%)
  monthly_emi:           number      // 0 if rejected
  rejection_reasons:     string[]
  breakdown:             Breakdown
  processing_time_ms:    number      // server-side inference duration
}

// ── 7. History ───────────────────────────────────────────────────────────────
/**
 * Represents a saved loan application in the user's results history.
 */
export interface HistoryItem {
  id:       string      // unique UUID or timestamp-based ID
  date:     string      // ISO timestamp
  loanType: LoanTypeId
  | 'bikeLoan' | 'carLoan' | 'homeLoan' | 'educationLoan' | 'personalLoan' // allow internal backend names too
  currency: CurrencyCode
  formData: FormData
  result:   LoanPredictResponse
}

// ── 8. LoanSubmitPayload ──────────────────────────────────────────────────────
/**
 * POST body sent to backend's /predict endpoint.
 * snake_case to match what FastAPI / Pydantic expects.
 * Built by createEligibilityRequestPayload() in utils.ts from FormData.
 */
export interface LoanSubmitPayload {
  // Core (always present)
  loan_type:            string
  gender:               string
  age:                  number
  years_of_experience:  number
  monthly_income:       number      // field name matches backend schemas.py
  coapplicant_income:   number
  credit_score:         number
  existing_emis:        number
  existing_loans_count: number
  loan_amount_requested: number     // field name matches backend schemas.py
  loan_tenure_months:   number      // converted from years to months
  employment_type:      string
  marital_status:       string
  education:            string
  dependents:           number
  property_area:        string

  // Optional override
  interest_rate?:       number

  // Car loan
  vehicle_price?:       number      // matches backend field name
  vehicle_age_years?:   number

  // Bike loan (reuses same backend fields as car)
  // vehicle_price and vehicle_age_years apply to both

  // Home loan
  property_type?:       string
  property_value?:      number

  // Education loan
  course_type?:         string
  institution_tier?:    string
  study_location?:      string
  course_duration?:     number

  // Shared
  down_payment?:        number
}

// ── 8. ApiError ───────────────────────────────────────────────────────────────
/**
 * Error shape carried by ApiRequestError in api.ts.
 * Covers both Pydantic 422 validation errors and custom predictor errors.
 */
export interface ApiError {
  message:    string
  statusCode: number
  errors:     string[]   // field-level validation messages from Pydantic / predictor
}

// ── 9. initialFormState ───────────────────────────────────────────────────────
/**
 * Blank / default form state.
 * Used to initialise the form in App.tsx and to reset it after submission.
 * Empty string '' means "not yet filled in".
 */
export const initialFormState: FormData = {
  // Profile
  loanType:           '',
  gender:             'Male',
  age:                '',
  yearsOfExperience:  '',
  employmentType:     '',
  maritalStatus:      '',
  education:          '',
  dependents:         '0',
  propertyArea:       '',
  // Financials
  applicantIncome:    '',
  coapplicantIncome:  '',
  creditScore:        '',
  existingEmis:       '',
  existingLoansCount: '0',
  // Loan
  loanAmount:         '',
  loanTenure:         5,        // 5 years is the most common default tenure
  customInterestRate: '',
  // Car
  carType:            '',
  carPrice:           '',
  carAge:             '',
  // Bike
  bikeType:           '',
  bikePrice:          '',
  bikeAge:            '',
  // Home
  propertyType:       '',
  propertyValue:      '',
  // Education
  courseType:         '',
  institutionTier:    '',
  studyLocation:      '',
  courseDuration:     '',
  // Shared
  downPayment:        '',
}

// ── 10. loanSpecificRequiredFields ────────────────────────────────────────────
/**
 * Maps each loan type → the FormData fields that MUST be filled for that type.
 * Core fields (age, income, credit score, etc.) are always required and are
 * not listed here — they are validated unconditionally in EnterDetails.tsx.
 */
export const loanSpecificRequiredFields: Record<LoanTypeId, string[]> = {
  car:       ['carType', 'carPrice', 'downPayment'],
  bike:      ['bikeType', 'bikePrice', 'downPayment'],
  home:      ['propertyType', 'propertyValue', 'downPayment'],
  education: ['courseType', 'institutionTier', 'studyLocation', 'courseDuration'],
  personal:  [],
  generic:   [],
}

// ── 11. hasLoanSpecificData ───────────────────────────────────────────────────
/**
 * Returns true if the user has filled the minimum required loan-specific fields.
 * Used in EnterDetails.tsx to gate the submit button.
 */
export const hasLoanSpecificData = (formData: FormData, loanType: LoanTypeId | ''): boolean => {
  switch (loanType) {
    case 'car':
      return !!(formData.carType && formData.carPrice)
    case 'bike':
      return !!(formData.bikeType && formData.bikePrice)
    case 'home':
      return !!(formData.propertyType && formData.propertyValue)
    case 'education':
      return !!(formData.courseType && formData.studyLocation && formData.institutionTier)
    case 'personal':
    case 'generic':
    case '':
      return true
  }
}