/**
 * utils.ts — Utility functions (validation, payload builder, formatters)
 *
 * Pure functions only — no React hooks or UI logic.
 * All functions are individually importable and unit-testable.
 *
 * Sections:
 *  1. cn()                              — Tailwind className merger
 *  2. Number parsing                    — safe parsers that handle Indian-formatted strings
 *  3. Formatters                        — currency, number, percentage display
 *  4. validateForm()                    — full form validation (used for final submit guard)
 *  5. createEligibilityRequestPayload() — maps FormData → ML model payload
 *  6. Look-up helpers                   — getLoanTypeById, getBanksByLoanType
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FormData, FormErrors, LoanType, Bank, LoanTypeId, LoanConfig, CurrencyCode } from '../lib/types'
import { formValidation, LOAN_CONFIG } from '../lib/constants'

// ── 1. cn — className merger ──────────────────────────────────────────────────
/**
 * Merges Tailwind utility classes, resolving conflicts intelligently.
 * - `clsx`    handles conditional / array class strings
 * - `twMerge` resolves Tailwind conflicts (e.g. `p-2` + `p-4` → `p-4`)
 *
 * @example
 *   cn('p-2 text-black', isActive && 'bg-blue-500', 'p-4')
 *   // → 'text-black bg-blue-500 p-4'
 */
export const cn = (...inputs: ClassValue[]): string =>
  twMerge(clsx(inputs))

// ── 1.1 Exchange Rates (Mock) ────────────────────────────────────────────────
/** 
 * Mock exchange rates relative to 1 INR.
 * In production, these should be fetched from an external API.
 */
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,   // 1 INR ≈ $0.012
  EUR: 0.011,   // 1 INR ≈ €0.011
  GBP: 0.0094,  // 1 INR ≈ £0.0094
}


// ── 2. Number parsing ─────────────────────────────────────────────────────────

/**
 * Parse a string that may contain Indian-locale commas into a number.
 *
 * Indian formatting uses commas differently from Western:
 *   '5,00,000' → 500000  (not NaN as with plain Number())
 *   '50,000'   → 50000
 *   ''         → 0
 *   'abc'      → 0
 *
 * This is the ONLY function that should be used to convert form field
 * strings to numbers — do not use bare Number() on formData fields.
 */
export const parseFormNumber = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isFinite(value) ? value : 0
  const stripped = String(value).replace(/,/g, '').trim()
  const parsed   = Number(stripped)
  return isFinite(parsed) ? parsed : 0
}

/**
 * Parse a decimal string (e.g. interest rate '8.5') — same as parseFormNumber
 * but makes intent explicit at call sites.
 */
export const parseDecimal = (value: string | undefined): number =>
  parseFormNumber(value)

// ── 3. Formatters ─────────────────────────────────────────────────────────────

/**
 * Format a number as currency based on the selected currency code.
 * 500000 ('INR') → '₹5,00,000'
 * 500000 ('USD') → '$500,000'
 */
export const formatCurrency = (amount: number, currency: CurrencyCode = 'INR'): string => {
  const rounded = Math.round(amount)
  switch (currency) {
    case 'USD': return `$${rounded.toLocaleString('en-US')}`
    case 'EUR': return `€${rounded.toLocaleString('de-DE')}`
    case 'GBP': return `£${rounded.toLocaleString('en-GB')}`
    case 'INR':
    default:    return `₹${rounded.toLocaleString('en-IN')}`
  }
}

/**
 * Convert an amount from one currency to another using mock rates.
 */
export const convertCurrency = (amount: number, from: CurrencyCode, to: CurrencyCode): number => {
  if (from === to) return amount
  // Convert to INR first (base currency)
  const inrAmount = amount / EXCHANGE_RATES[from]
  // Then convert from INR to target
  return inrAmount * EXCHANGE_RATES[to]
}


/**
 * Format with Indian locale grouping only (no ₹ symbol): 500000 → '5,00,000'
 * Used for input display values where the ₹ prefix is rendered separately.
 */
export const formatNumber = (num: number): string =>
  num.toLocaleString('en-IN')

/**
 * Format a 0–1 ratio as a percentage string: 0.4250 → '42.50%'
 */
export const formatPercent = (ratio: number, decimals = 2): string =>
  `${(ratio * 100).toFixed(decimals)}%`

// ── 4. validateForm ───────────────────────────────────────────────────────────
/**
 * Full form validation — returns a map of field → error message.
 * An empty return value `{}` means the form is valid.
 *
 * NOTE: EnterDetails.tsx performs the same validation on individual fields
 * on blur for a better UX (per-field, on interaction). This function is the
 * final gate before submission and validates everything in one pass.
 * Both must stay in sync — if you change a rule here, update EnterDetails too.
 *
 * Validation strategy:
 *  - All string inputs are parsed with `parseFormNumber` to handle Indian-locale
 *    commas before numeric comparison (e.g. "5,00,000" → 500000).
 *  - Core fields are always validated.
 *  - Loan-specific fields are only validated when `loanType` matches.
 *  - Limits come from `formValidation` in constants.tsx (single source of truth).
 *
 * @param formData          — current form state
 * @param loanTypeMaxAmount — max loan amount for the selected loan type
 * @param loanType          — enables loan-specific field validation
 */
export const validateForm = (
  formData: FormData,
  loanTypeMaxAmount: number,
  loanType?: LoanTypeId | '',
  currency: CurrencyCode = 'INR',
): FormErrors => {
  const errors: FormErrors = {}
  const num = parseFormNumber  // shorthand

  // ── Age ──────────────────────────────────────────────────────────────────
  const age = num(formData.age)
  if (!formData.age)
    errors.age = 'Age is required'
  else if (age < formValidation.age.min || age > formValidation.age.max)
    errors.age = formValidation.age.error

  // ── Years of experience ──────────────────────────────────────────────────
  if (formData.yearsOfExperience === '' || formData.yearsOfExperience === undefined) {
    errors.yearsOfExperience = 'Work experience is required (enter 0 if fresher)'
  } else {
    const exp = num(formData.yearsOfExperience)
    if (exp < formValidation.yearsOfExperience.min || exp > formValidation.yearsOfExperience.max)
      errors.yearsOfExperience = formValidation.yearsOfExperience.error
  }

  // ── Applicant income ─────────────────────────────────────────────────────
  const income = num(formData.applicantIncome)
  if (!formData.applicantIncome || income < formValidation.applicantIncome.min)
    errors.applicantIncome = `Minimum monthly income is ${formatCurrency(formValidation.applicantIncome.min, currency)}`
  else if (income > formValidation.applicantIncome.max)
    errors.applicantIncome = `Maximum monthly income is ${formatCurrency(formValidation.applicantIncome.max, currency)}`

  // ── Co-applicant income (0 is valid — not required) ──────────────────────
  const coIncome = num(formData.coapplicantIncome)
  if (coIncome < 0)
    errors.coapplicantIncome = 'Co-applicant income cannot be negative'
  else if (coIncome > formValidation.coapplicantIncome.max)
    errors.coapplicantIncome = `Co-applicant income cannot exceed ${formatCurrency(formValidation.coapplicantIncome.max, currency)}`

  // ── Credit score ─────────────────────────────────────────────────────────
  const creditScore = num(formData.creditScore)
  if (!formData.creditScore)
    errors.creditScore = 'Credit score is required'
  else if (creditScore < formValidation.creditScore.min || creditScore > formValidation.creditScore.max)
    errors.creditScore = formValidation.creditScore.error

  // ── Existing EMIs (must explicitly enter 0 if none) ──────────────────────
  if (formData.existingEmis === '' || formData.existingEmis === undefined) {
    errors.existingEmis = 'Enter your total existing EMIs (0 if none)'
  } else {
    const emis = num(formData.existingEmis)
    if (emis < 0)
      errors.existingEmis = 'Existing EMIs cannot be negative'
    else if (emis > formValidation.existingEmis.max)
      errors.existingEmis = `Existing EMIs cannot exceed ${formatCurrency(formValidation.existingEmis.max, currency)} per month`
  }

  // ── Existing loans count ('0' is valid) ──────────────────────────────────
  if (!formData.existingLoansCount && formData.existingLoansCount !== '0')
    errors.existingLoansCount = 'Please select number of active loans'

  // ── Loan amount ──────────────────────────────────────────────────────────
  const loanAmount = num(formData.loanAmount)
  if (!formData.loanAmount || loanAmount < formValidation.loanAmount.min)
    errors.loanAmount = `Minimum loan amount is ${formatCurrency(formValidation.loanAmount.min, currency)}`
  else if (loanAmount > loanTypeMaxAmount)
    errors.loanAmount = `Maximum for this loan type is ${formatCurrency(loanTypeMaxAmount, currency)}`

  // ── Custom interest rate (optional) ──────────────────────────────────────
  if (formData.customInterestRate) {
    const rate = parseDecimal(formData.customInterestRate)
    if (!rate || rate < formValidation.customRate.min)
      errors.customInterestRate = `Interest rate must be at least ${formValidation.customRate.min}%`
    else if (rate > formValidation.customRate.max)
      errors.customInterestRate = `Interest rate cannot exceed ${formValidation.customRate.max}%`
  }

  // ── Required selects ─────────────────────────────────────────────────────
  if (!formData.employmentType) errors.employmentType = 'Employment type is required'
  if (!formData.maritalStatus)  errors.maritalStatus  = 'Marital status is required'
  if (!formData.education)      errors.education      = 'Education level is required'
  if (!formData.propertyArea)   errors.propertyArea   = 'Residential area is required'

  // ── Loan-type-specific ────────────────────────────────────────────────────

  if (loanType === 'car') {
    if (!formData.carType)  errors.carType  = 'Car type is required'
    if (!formData.carPrice || num(formData.carPrice) <= 0)
      errors.carPrice = 'Car price is required'
    if (!formData.downPayment)
      errors.downPayment = 'Down payment is required'

    // Down payment must be at least 5% of car price
    const carPrice    = num(formData.carPrice)
    const downPayment = num(formData.downPayment)
    if (carPrice > 0 && downPayment > 0) {
      const minDown = carPrice * 0.05
      if (downPayment < minDown)
        errors.downPayment = `Down payment must be at least 5% (₹${formatNumber(Math.ceil(minDown))})`
    }
  }

  if (loanType === 'bike') {
    if (!formData.bikeType)  errors.bikeType  = 'Bike type is required'
    if (!formData.bikePrice || num(formData.bikePrice) <= 0)
      errors.bikePrice = 'Bike price is required'
    if (!formData.downPayment)
      errors.downPayment = 'Down payment is required'
  }

  if (loanType === 'home') {
    if (!formData.propertyType)  errors.propertyType  = 'Property type is required'
    if (!formData.propertyValue || num(formData.propertyValue) <= 0)
      errors.propertyValue = 'Property value is required'

    if (!formData.downPayment) {
      errors.downPayment = 'Down payment is required'
    } else {
      const propValue   = num(formData.propertyValue)
      const downPayment = num(formData.downPayment)
      const minDown     = propValue * 0.20
      if (propValue > 0 && downPayment < minDown)
        errors.downPayment = `Minimum 20% down payment: ₹${formatNumber(Math.ceil(minDown))}`
    }
  }

  if (loanType === 'education') {
    if (!formData.courseType)      errors.courseType      = 'Course type is required'
    if (!formData.institutionTier) errors.institutionTier = 'Institution tier is required'
    if (!formData.studyLocation)   errors.studyLocation   = 'Study location is required'
    if (!formData.courseDuration || num(formData.courseDuration) <= 0)
      errors.courseDuration = 'Course duration is required'
  }

  return errors
}

// ── 5. createEligibilityRequestPayload ───────────────────────────────────────
/**
 * Converts React FormData → JSON payload for POST /predict.
 *
 * Key transformations:
 *  - Frontend IDs ('car') → model strings ('carLoan')
 *  - loanTenure: years → months (× 12)
 *  - All numeric fields use `parseFormNumber` — handles Indian-locale commas
 *    (plain Number("5,00,000") returns NaN; parseFormNumber returns 500000)
 *  - Loan-specific fields appended only when relevant
 *
 * Field names must match backend/schemas.py exactly.
 */
export const createEligibilityRequestPayload = (
  formData: FormData,
  loanType: LoanTypeId | string,
) => {
  const LOAN_TYPE_MAP: Record<string, string> = {
    car:       'carLoan',
    bike:      'bikeLoan',
    home:      'homeLoan',
    education: 'educationLoan',
    personal:  'personalLoan',
    generic:   'personalLoan',
  }

  const num = parseFormNumber  // shorthand — strips commas, parses safely

  const base = {
    loan_type:            LOAN_TYPE_MAP[loanType] ?? loanType,
    gender:               formData.gender || 'Male',
    age:                  num(formData.age),
    years_of_experience:  num(formData.yearsOfExperience),
    monthly_income:       num(formData.applicantIncome),
    coapplicant_income:   num(formData.coapplicantIncome),
    credit_score:         num(formData.creditScore),
    existing_emis:        num(formData.existingEmis),
    existing_loans_count: num(formData.existingLoansCount),
    loan_amount_requested: num(formData.loanAmount),
    loan_tenure_months:   num(formData.loanTenure) * 12,   // years → months
    employment_type:      formData.employmentType,
    marital_status:       formData.maritalStatus,
    education:            formData.education,
    dependents:           num(formData.dependents),
    property_area:        formData.propertyArea,
    ...(formData.customInterestRate
      ? { interest_rate: parseDecimal(formData.customInterestRate) }
      : {}),
  }

  if (loanType === 'car') {
    return {
      ...base,
      vehicle_price:     num(formData.carPrice),
      vehicle_age_years: num(formData.carAge),   // 0 for new cars
    }
  }

  if (loanType === 'bike') {
    return {
      ...base,
      vehicle_price:     num(formData.bikePrice),
      vehicle_age_years: num(formData.bikeAge),  // 0 for new bikes
    }
  }

  if (loanType === 'home') {
    return {
      ...base,
      property_value: num(formData.propertyValue),
    }
  }

  if (loanType === 'education') {
    return {
      ...base,
      course_type:      formData.courseType      ?? '',
      institution_tier: formData.institutionTier ?? '',
      // studyLocation is UI context only — not a model feature, not sent
    }
  }

  // personal / generic — base payload only
  return base
}

// ── 6. Look-up helpers ────────────────────────────────────────────────────────

/**
 * Find a LoanType object from the loanTypes array by its ID.
 * Returns `null` if not found rather than `undefined` (easier to guard against).
 */
export const getLoanTypeById = (
  loanTypes: LoanType[],
  loanTypeId: LoanTypeId | string,
): LoanType | null =>
  loanTypes.find(l => l.id === loanTypeId) ?? null

/**
 * Return the recommended banks array for a given loan type ID.
 * Returns an empty array if the loan type has no bank recommendations.
 */
export const getBanksByLoanType = (
  banksByLoanType: Partial<Record<LoanTypeId, Bank[]>>,
  loanTypeId: LoanTypeId | string,
): Bank[] =>
  banksByLoanType[loanTypeId as LoanTypeId] ?? []

/**
 * Resolve the LoanConfig for a given loan type ID.
 * Falls back to 'personal' loan config if the ID is invalid or empty.
 */
export const resolveConfig = (loanType: string): LoanConfig =>
  (LOAN_CONFIG as Record<string, LoanConfig>)[loanType] ?? LOAN_CONFIG.personal