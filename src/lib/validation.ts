/**
 * src/lib/validation.ts
 *
 * Centralised Zod validation schemas for the loan application form.
 *
 * This file replaces the procedural validation logic in EnterDetails.tsx.
 * It enforces:
 *  - Type safety (string → number conversion)
 *  - Numeric bounds (age, income, loan amount)
 *  - Conditional required fields (based on loanType)
 *  - Cross-field dependencies (yearsOfExperience <= age - MIN_WORK_AGE)
 */

import { z } from 'zod'
import type { CurrencyCode } from './types'
import { formatCurrency } from './utils'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// These are exported so EnterDetails.tsx can still use them for UI hints / sliders.

export const MIN_AGE = 18
export const MAX_AGE = 70
export const MIN_WORK_AGE = 16

export const MIN_DOWN_PAYMENT_RATIO_HOME = 0.20
export const MIN_DOWN_PAYMENT_RATIO_VEHICLE = 0.10

export const MIN_LOAN_AMOUNT = 10_000
export const MAX_INCOME = 10_000_000

export const MIN_CREDIT_SCORE = 300
export const MAX_CREDIT_SCORE = 900

export const MIN_INTEREST_RATE = 2
export const MAX_INTEREST_RATE = 30

export const MAX_VEHICLE_AGE = 20
export const MAX_COURSE_DURATION = 10

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Normalises Indian-formatted currency strings or raw strings to numbers. */
const toNum = (v: any): number => {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return 0
  const n = parseFloat(v.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

const numericString = (msg: string) => 
  z.string()
   .min(1, msg)
   .refine((v) => !isNaN(toNum(v)), "Must be a valid number")

export const getLoanFormSchema = (currency: CurrencyCode = 'INR', loanTypeMax: number = MAX_INCOME) => {
  const HomeFieldsSchema = z.object({
    loanType: z.literal('home'),
    propertyType: z.string().min(1, "Property type is required"),
    propertyValue: numericString("Property value is required")
      .refine((v) => toNum(v) > 0, "Property value must be greater than 0"),
    downPayment: numericString("Down payment is required")
  }).refine((data) => {
    const propVal = toNum(data.propertyValue)
    const dpVal = toNum(data.downPayment)
    const minRequired = Math.ceil(propVal * MIN_DOWN_PAYMENT_RATIO_HOME)
    return dpVal >= minRequired
  }, {
    message: `Minimum down payment is 20% of property value`,
    path: ['downPayment']
  })

  const VehicleFieldsSchema = (type: 'car' | 'bike') => z.object({
    loanType: z.literal(type),
    [`${type}Type`]: z.string().min(1, `${type === 'car' ? 'Car' : 'Bike'} type is required`),
    [`${type}Price`]: numericString(`${type === 'car' ? 'Car' : 'Bike'} price is required`)
      .refine((v) => toNum(v) > 0, `${type === 'car' ? 'Car' : 'Bike'} price must be greater than 0`),
    [`${type}Age`]: z.string().optional(),
    downPayment: numericString("Down payment is required")
  }).refine((data) => {
    const vType = data[`${type}Type` as keyof typeof data]
    const vAge = data[`${type}Age` as keyof typeof data]
    if (vType === 'used') {
      if (!vAge || vAge === '') return false
      const n = toNum(vAge)
      return n >= 1 && n <= MAX_VEHICLE_AGE
    }
    return true
  }, {
    message: `Age required (1-${MAX_VEHICLE_AGE} yrs) for used vehicles`,
    path: [`${type}Age`]
  }).refine((data) => {
    const price = toNum(data[`${type}Price` as keyof typeof data])
    const dpVal = toNum(data.downPayment)
    const minRequired = Math.ceil(price * MIN_DOWN_PAYMENT_RATIO_VEHICLE)
    return dpVal >= minRequired
  }, {
    message: `Minimum down payment is 10% of price`,
    path: ['downPayment']
  })

  const EducationFieldsSchema = z.object({
    loanType: z.literal('education'),
    courseType: z.string().min(1, "Course type is required"),
    institutionTier: z.string().min(1, "Institution tier is required"),
    studyLocation: z.string().min(1, "Study location is required"),
    courseDuration: numericString("Course duration is required")
      .refine((v) => toNum(v) >= 1 && toNum(v) <= MAX_COURSE_DURATION, `Duration must be 1-${MAX_COURSE_DURATION} years`)
  })

  const GenericFieldsSchema = z.object({
    loanType: z.enum(['personal', 'generic', ''])
  })

  return z.object({
    // Core
    gender: z.enum(['Male', 'Female']).or(z.literal('')),
    age: numericString("Age is required")
      .refine((v) => toNum(v) >= MIN_AGE && toNum(v) <= MAX_AGE, `Age must be ${MIN_AGE}-${MAX_AGE}`),
    applicantIncome: numericString("Income is required")
      .refine((v) => {
        const val = toNum(v)
        return val >= 15000 && val <= MAX_INCOME
      }, `Income must be between ${formatCurrency(15000, currency)} and ${formatCurrency(MAX_INCOME, currency)}`),
    coapplicantIncome: z.string().optional(),
    yearsOfExperience: numericString("Experience is required")
      .refine((v) => toNum(v) >= 0, "Experience cannot be negative"),
    existingEmis: numericString("Existing EMIs required")
      .refine((v) => toNum(v) >= 0, "EMI cannot be negative"),
    existingLoansCount: z.string().min(1, "Select number of active loans"),
    creditScore: numericString("Credit score is required")
      .refine((v) => toNum(v) >= MIN_CREDIT_SCORE && toNum(v) <= MAX_CREDIT_SCORE, `Score must be ${MIN_CREDIT_SCORE}-${MAX_CREDIT_SCORE}`),
    employmentType: z.string().min(1, "Employment type is required"),
    maritalStatus: z.string().min(1, "Marital status is required"),
    education: z.string().min(1, "Education level is required"),
    propertyArea: z.string().min(1, "Residential area is required"),
    
    loanAmount: numericString("Loan amount is required")
      .refine((v) => {
        const val = toNum(v)
        return val >= MIN_LOAN_AMOUNT && val <= loanTypeMax
      }, `Amount must be ${formatCurrency(MIN_LOAN_AMOUNT, currency)} - ${formatCurrency(loanTypeMax, currency)}`),
    
    loanTenure: z.number().min(1),
    customInterestRate: z.string().optional().refine((v) => {
      if (!v || v === '') return true
      const n = parseFloat(v)
      return n >= MIN_INTEREST_RATE && n <= MAX_INTEREST_RATE
    }, `Rate must be ${MIN_INTEREST_RATE}-${MAX_INTEREST_RATE}%`),

    loanType: z.string()
  }).and(
    z.discriminatedUnion('loanType', [
      HomeFieldsSchema,
      VehicleFieldsSchema('car'),
      VehicleFieldsSchema('bike'),
      EducationFieldsSchema,
      GenericFieldsSchema
    ])
  ).refine((data) => {
    const age = toNum(data.age)
    const exp = toNum(data.yearsOfExperience)
    return exp <= (age - MIN_WORK_AGE)
  }, {
    message: `Experience cannot exceed age minus ${MIN_WORK_AGE}`,
    path: ['yearsOfExperience']
  })
}

export type ValidatedLoanForm = z.infer<ReturnType<typeof getLoanFormSchema>>
