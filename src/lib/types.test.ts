/**
 * types.test.ts — Tests for shared types and constants in src/lib/types.ts
 *
 * Tests:
 *   initialFormState — default field values
 *   hasLoanSpecificData — type guard per loan type
 *   loanSpecificRequiredFields — required fields mapping
 */

import { describe, it, expect } from 'vitest'
import { initialFormState, hasLoanSpecificData, loanSpecificRequiredFields } from './types'

describe('initialFormState', () => {
  it('has gender defaulting to Male', () => {
    expect(initialFormState.gender).toBe('Male')
  })

  it('has loanTenure defaulting to 5 years', () => {
    expect(initialFormState.loanTenure).toBe(5)
  })

  it('has dependents defaulting to "0"', () => {
    expect(initialFormState.dependents).toBe('0')
  })

  it('has empty string for loanType', () => {
    expect(initialFormState.loanType).toBe('')
  })

  it('has empty strings for all text input fields', () => {
    expect(initialFormState.age).toBe('')
    expect(initialFormState.applicantIncome).toBe('')
    expect(initialFormState.creditScore).toBe('')
    expect(initialFormState.loanAmount).toBe('')
  })
})

describe('hasLoanSpecificData', () => {
  const base = { ...initialFormState }

  it('returns true for personal loan with no specific fields needed', () => {
    expect(hasLoanSpecificData(base, 'personal')).toBe(true)
  })

  it('returns true for generic loan type', () => {
    expect(hasLoanSpecificData(base, 'generic')).toBe(true)
  })

  it('returns true for empty loanType', () => {
    expect(hasLoanSpecificData(base, '')).toBe(true)
  })

  it('returns false for car loan without required fields', () => {
    expect(hasLoanSpecificData(base, 'car')).toBe(false)
  })

  it('returns true for car loan with carType and carPrice filled', () => {
    const form = { ...base, carType: 'new', carPrice: '800000' }
    expect(hasLoanSpecificData(form, 'car')).toBe(true)
  })

  it('returns false for bike loan without required fields', () => {
    expect(hasLoanSpecificData(base, 'bike')).toBe(false)
  })

  it('returns true for bike loan with bikeType and bikePrice filled', () => {
    const form = { ...base, bikeType: 'new', bikePrice: '100000' }
    expect(hasLoanSpecificData(form, 'bike')).toBe(true)
  })

  it('returns false for home loan without required fields', () => {
    expect(hasLoanSpecificData(base, 'home')).toBe(false)
  })

  it('returns true for home loan with propertyType and propertyValue filled', () => {
    const form = { ...base, propertyType: 'flat', propertyValue: '5000000' }
    expect(hasLoanSpecificData(form, 'home')).toBe(true)
  })

  it('returns false for education loan without required fields', () => {
    expect(hasLoanSpecificData(base, 'education')).toBe(false)
  })

  it('returns true for education loan with all required fields', () => {
    const form = {
      ...base,
      courseType: 'Engineering',
      institutionTier: 'Tier-1',
      studyLocation: 'india',
    }
    expect(hasLoanSpecificData(form, 'education')).toBe(true)
  })
})

describe('loanSpecificRequiredFields', () => {
  it('car requires carType, carPrice, downPayment', () => {
    expect(loanSpecificRequiredFields.car).toEqual(['carType', 'carPrice', 'downPayment'])
  })

  it('personal has no required specific fields', () => {
    expect(loanSpecificRequiredFields.personal).toEqual([])
  })

  it('education requires 4 fields', () => {
    expect(loanSpecificRequiredFields.education).toHaveLength(4)
  })
})
