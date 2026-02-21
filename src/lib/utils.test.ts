/**
 * utils.test.ts — Unit tests for src/lib/utils.ts
 *
 * Pure functions tested:
 *   parseFormNumber  — Indian-locale number parsing
 *   formatCurrency   — ₹ formatting
 *   formatNumber     — Indian locale grouping
 *   formatPercent    — ratio → percentage string
 *   validateForm     — full form validation gate
 *   createEligibilityRequestPayload — form → backend payload mapping
 *   getLoanTypeById / getBanksByLoanType — look-up helpers
 */

import { describe, it, expect } from 'vitest'
import {
  parseFormNumber,
  formatCurrency,
  formatNumber,
  formatPercent,
  validateForm,
  createEligibilityRequestPayload,
  getLoanTypeById,
  getBanksByLoanType,
} from './utils'
import type { FormData, LoanType, Bank, LoanTypeId } from './types'
import { initialFormState } from './types'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid form data for a personal loan (all required core fields). */
const validPersonalForm = (): FormData => ({
  ...initialFormState,
  loanType:           'personal',
  gender:             'Male',
  age:                '30',
  yearsOfExperience:  '5',
  applicantIncome:    '50000',
  coapplicantIncome:  '0',
  creditScore:        '700',
  existingEmis:       '0',
  existingLoansCount: '0',
  loanAmount:         '500000',
  loanTenure:         5,
  customInterestRate: '',
  employmentType:     'Salaried',
  maritalStatus:      'Single',
  education:          'Graduate',
  propertyArea:       'Urban',
  dependents:         '0',
})

// ── 1. parseFormNumber ────────────────────────────────────────────────────────

describe('parseFormNumber', () => {
  it('parses plain integers', () => {
    expect(parseFormNumber('12345')).toBe(12345)
  })

  it('strips Indian-locale commas: 5,00,000 → 500000', () => {
    expect(parseFormNumber('5,00,000')).toBe(500000)
  })

  it('strips Western commas: 50,000 → 50000', () => {
    expect(parseFormNumber('50,000')).toBe(50000)
  })

  it('returns 0 for empty string', () => {
    expect(parseFormNumber('')).toBe(0)
  })

  it('returns 0 for null', () => {
    expect(parseFormNumber(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(parseFormNumber(undefined)).toBe(0)
  })

  it('returns 0 for non-numeric string', () => {
    expect(parseFormNumber('abc')).toBe(0)
  })

  it('passes through a finite number unchanged', () => {
    expect(parseFormNumber(42)).toBe(42)
  })

  it('returns 0 for Infinity', () => {
    expect(parseFormNumber(Infinity)).toBe(0)
  })

  it('parses decimal strings', () => {
    expect(parseFormNumber('8.5')).toBe(8.5)
  })
})

// ── 2. formatCurrency ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats zero as ₹0', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })

  it('formats 500000 with Indian grouping', () => {
    expect(formatCurrency(500000)).toBe('₹5,00,000')
  })

  it('rounds to nearest rupee', () => {
    expect(formatCurrency(100.6)).toBe('₹101')
  })
})

// ── 3. formatNumber ───────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats 500000 as 5,00,000', () => {
    expect(formatNumber(500000)).toBe('5,00,000')
  })

  it('formats 1000 as 1,000', () => {
    expect(formatNumber(1000)).toBe('1,000')
  })

  it('formats 0 as 0', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

// ── 4. formatPercent ─────────────────────────────────────────────────────────

describe('formatPercent', () => {
  it('formats 0.4250 as "42.50%"', () => {
    expect(formatPercent(0.4250)).toBe('42.50%')
  })

  it('formats 1 as "100.00%"', () => {
    expect(formatPercent(1)).toBe('100.00%')
  })

  it('respects custom decimals', () => {
    expect(formatPercent(0.5, 0)).toBe('50%')
  })
})

// ── 5. validateForm ───────────────────────────────────────────────────────────

describe('validateForm', () => {
  it('returns no errors for a fully valid personal loan form', () => {
    const errors = validateForm(validPersonalForm(), 2_500_000, 'personal')
    expect(errors).toEqual({})
  })

  it('reports error when age is missing', () => {
    const form = { ...validPersonalForm(), age: '' }
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.age).toBeTruthy()
  })

  it('reports error when age is below minimum (17)', () => {
    const form = { ...validPersonalForm(), age: '17' }
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.age).toBeTruthy()
  })

  it('reports error when income is missing', () => {
    const form = { ...validPersonalForm(), applicantIncome: '' }
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.applicantIncome).toBeTruthy()
  })

  it('reports error when credit score is out of range (high)', () => {
    const form = { ...validPersonalForm(), creditScore: '1000' }
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.creditScore).toBeTruthy()
  })

  it('reports error when loan amount exceeds type max', () => {
    const form = { ...validPersonalForm(), loanAmount: '9999999' }
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.loanAmount).toBeTruthy()
  })

  it('reports car-specific errors when loan type is car', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'car',
      carType: '',    // missing
      carPrice: '',   // missing
      downPayment: '',
    }
    const errors = validateForm(form, 5_000_000, 'car')
    expect(errors.carType).toBeTruthy()
    expect(errors.carPrice).toBeTruthy()
    expect(errors.downPayment).toBeTruthy()
  })

  it('requires 5% down payment for car loans', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'car',
      carType: 'new',
      carPrice: '1000000',
      downPayment: '10000', // only 1% — less than required 5%
    }
    const errors = validateForm(form, 5_000_000, 'car')
    expect(errors.downPayment).toMatch(/5%/i)
  })

  it('requires 20% down payment for home loans', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'home',
      propertyType: 'flat',
      propertyValue: '5000000',
      downPayment: '50000', // only 1% — less than required 20%
    }
    const errors = validateForm(form, 10_000_000, 'home')
    expect(errors.downPayment).toMatch(/20%/i)
  })

  it('requires education-specific fields for education loans', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'education',
      courseType: '',
      institutionTier: '',
      studyLocation: '',
      courseDuration: '',
    }
    const errors = validateForm(form, 2_000_000, 'education')
    expect(errors.courseType).toBeTruthy()
    expect(errors.institutionTier).toBeTruthy()
    expect(errors.studyLocation).toBeTruthy()
    expect(errors.courseDuration).toBeTruthy()
  })

  it('validates custom interest rate when provided', () => {
    const form = { ...validPersonalForm(), customInterestRate: '100' } // >30%
    const errors = validateForm(form, 2_500_000, 'personal')
    expect(errors.customInterestRate).toBeTruthy()
  })
})

// ── 6. createEligibilityRequestPayload ───────────────────────────────────────

describe('createEligibilityRequestPayload', () => {
  it('maps frontend camelCase to backend snake_case', () => {
    const payload = createEligibilityRequestPayload(validPersonalForm(), 'personal')
    expect(payload.monthly_income).toBe(50000)
    expect(payload.credit_score).toBe(700)
    expect(payload.loan_type).toBe('personalLoan')
  })

  it('converts loanTenure from years to months', () => {
    const form = { ...validPersonalForm(), loanTenure: 5 }
    const payload = createEligibilityRequestPayload(form, 'personal')
    expect(payload.loan_tenure_months).toBe(60)
  })

  it('maps "car" → "carLoan"', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'car',
      carType: 'new',
      carPrice: '800000',
      carAge: '0',
    }
    const payload = createEligibilityRequestPayload(form, 'car')
    expect(payload.loan_type).toBe('carLoan')
    expect((payload as Record<string, unknown>).vehicle_price).toBe(800000)
  })

  it('maps "home" → "homeLoan" and includes property_value', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'home',
      propertyValue: '5000000',
    }
    const payload = createEligibilityRequestPayload(form, 'home')
    expect(payload.loan_type).toBe('homeLoan')
    expect((payload as Record<string, unknown>).property_value).toBe(5000000)
  })

  it('maps "education" → "educationLoan" with course fields', () => {
    const form: FormData = {
      ...validPersonalForm(),
      loanType: 'education',
      courseType: 'Engineering',
      institutionTier: 'Tier-1',
    }
    const payload = createEligibilityRequestPayload(form, 'education') as Record<string, unknown>
    expect(payload.loan_type).toBe('educationLoan')
    expect(payload.course_type).toBe('Engineering')
    expect(payload.institution_tier).toBe('Tier-1')
  })

  it('parses Indian-formatted income correctly', () => {
    const form = { ...validPersonalForm(), applicantIncome: '5,00,000' }
    const payload = createEligibilityRequestPayload(form, 'personal')
    expect(payload.monthly_income).toBe(500000)
  })

  it('includes custom interest rate when provided', () => {
    const form = { ...validPersonalForm(), customInterestRate: '9.5' }
    const payload = createEligibilityRequestPayload(form, 'personal') as Record<string, unknown>
    expect(payload.interest_rate).toBe(9.5)
  })

  it('omits interest_rate when customInterestRate is empty', () => {
    const form = { ...validPersonalForm(), customInterestRate: '' }
    const payload = createEligibilityRequestPayload(form, 'personal') as Record<string, unknown>
    expect(payload.interest_rate).toBeUndefined()
  })
})

// ── 7. getLoanTypeById ────────────────────────────────────────────────────────

describe('getLoanTypeById', () => {
  const loanTypes: LoanType[] = [
    { id: 'car', name: 'Car Loan', description: '', icon: null, rateRange: '', maxAmount: 5_000_000, maxTenure: 7, defaultRate: 8.5, requiresSpecificFields: true },
    { id: 'home', name: 'Home Loan', description: '', icon: null, rateRange: '', maxAmount: 10_000_000, maxTenure: 30, defaultRate: 7.5, requiresSpecificFields: true },
  ]

  it('returns the matching loan type', () => {
    const result = getLoanTypeById(loanTypes, 'car')
    expect(result?.name).toBe('Car Loan')
  })

  it('returns null for an unknown ID', () => {
    expect(getLoanTypeById(loanTypes, 'unknown')).toBeNull()
  })
})

// ── 8. getBanksByLoanType ─────────────────────────────────────────────────────

describe('getBanksByLoanType', () => {
  const carBanks: Bank[] = [
    { name: 'HDFC', rate: 8.5, maxAmount: 5_000_000, processingFee: '0.5%', rating: 4.5 },
  ]
  const banks: Partial<Record<LoanTypeId, Bank[]>> = { car: carBanks }

  it('returns banks for a known loan type', () => {
    expect(getBanksByLoanType(banks, 'car')).toEqual(carBanks)
  })

  it('returns empty array for a loan type with no banks', () => {
    expect(getBanksByLoanType(banks, 'personal')).toEqual([])
  })
})
