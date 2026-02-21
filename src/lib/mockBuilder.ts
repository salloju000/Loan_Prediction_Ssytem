/**
 * lib/mockBuilder.ts
 *
 * Builds a realistic-looking LoanPredictResponse when running in offline mode
 * (backend unavailable). Uses standard reducing-balance EMI formula.
 *
 * Extracted from App.tsx to keep the root component focused on orchestration.
 */

import type { FormData, LoanPredictResponse } from './types'

// ── Constants ─────────────────────────────────────────────────────────────────

/** 8.5% p.a. — used as the offline estimate interest rate. */
export const MOCK_INTEREST_RATE = 0.085

const LOAN_TYPE_MAP: Record<string, string> = {
  car: 'carLoan',
  bike: 'bikeLoan',
  home: 'homeLoan',
  education: 'educationLoan',
  personal: 'personalLoan',
  generic: 'personalLoan',
}

const inrFormat = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`

// ── Type guard ────────────────────────────────────────────────────────────────

/**
 * Runtime type guard — verifies that an unknown value has the minimum shape
 * of a LoanPredictResponse before it is stored in state or displayed.
 */
export const isValidResult = (v: unknown): v is LoanPredictResponse =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as LoanPredictResponse).approved !== 'undefined' &&
  typeof (v as LoanPredictResponse).breakdown === 'object'

// ── Mock builder ──────────────────────────────────────────────────────────────

/**
 * Constructs a plausible offline loan result from the current form data.
 * Uses a simplified approval heuristic (credit score + DTI) and standard
 * reducing-balance EMI formula.
 *
 * The returned object has `status: 'mock'` — the UI uses this to show
 * an "Estimated result — offline mode" badge.
 */
export const buildMockResult = (formData: FormData): LoanPredictResponse => {
  const income = Number(formData.applicantIncome) || 50_000
  const coIncome = Number(formData.coapplicantIncome) || 0
  const totalIncome = income + coIncome
  const loanAmount = Number(formData.loanAmount) || 5_00_000
  const tenureYears = Number(formData.loanTenure) || 5
  const tenureMonths = tenureYears * 12
  const existingEmis = Number(formData.existingEmis) || 0
  const creditScore = Number(formData.creditScore) || 700
  const existingLoans = Number(formData.existingLoansCount) || 0

  // Standard reducing-balance EMI formula: P × r(1+r)^n / ((1+r)^n − 1)
  const monthlyRate = MOCK_INTEREST_RATE / 12
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  )

  const dti = (existingEmis + emi) / Math.max(totalIncome, 1)
  const approved = creditScore >= 650 && dti < 0.65
  const sanctionedAmt = approved ? Math.round(loanAmount * 0.88) : 0
  const freeIncome = Math.max(0, totalIncome - existingEmis - emi)

  const creditBand =
    creditScore >= 750 ? 'Excellent' :
      creditScore >= 700 ? 'Good' :
        creditScore >= 650 ? 'Fair' : 'Poor'

  const rejectionReasons: string[] = []
  if (!approved) {
    if (creditScore < 650) {
      rejectionReasons.push(`Credit score too low (${creditScore.toLocaleString('en-IN')} < 650 minimum)`)
    }
    if (dti >= 0.65) {
      rejectionReasons.push(`Debt-to-income ratio too high (${(dti * 100).toFixed(1)}% > 65% limit)`)
    }
  }

  return {
    status: 'mock' as 'success',   // cast: mock is only for offline display
    loan_type: LOAN_TYPE_MAP[formData.loanType ?? 'personal'] ?? 'personalLoan',
    applicant_name: 'Applicant',
    approved,
    approval_probability: approved ? 72 : 28,
    loan_grade: approved ? 'B  (Good)' : 'D  (Below Average)',
    loan_amount_requested: loanAmount,
    sanctioned_amount: sanctionedAmt,
    sanction_ratio: approved ? 88 : 0,
    monthly_emi: approved ? emi : 0,
    rejection_reasons: rejectionReasons,
    processing_time_ms: 0,
    breakdown: {
      financial_health: {
        total_monthly_income: inrFormat(totalIncome),
        existing_monthly_emis: inrFormat(existingEmis),
        projected_new_emi: inrFormat(emi),
        free_monthly_income: inrFormat(freeIncome),
        debt_to_income_ratio: `${(dti * 100).toFixed(1)}%`,
        emi_to_income_ratio: `${((emi / Math.max(totalIncome, 1)) * 100).toFixed(1)}%`,
      },
      credit_profile: {
        credit_score: creditScore,
        credit_score_band: creditBand,
        existing_loans: existingLoans,
        is_high_risk_flag: dti > 0.6 && creditScore < 650,
      },
      loan_metrics: {
        amount_requested: inrFormat(loanAmount),
        tenure: `${tenureYears} year${tenureYears !== 1 ? 's' : ''}`,
        loan_to_income_ratio: `${((loanAmount / Math.max(totalIncome * 12, 1)) * 100).toFixed(1)}%`,
        sanctioned_amount: approved ? inrFormat(sanctionedAmt) : '—',
        monthly_emi_if_approved: approved ? inrFormat(emi) : '—',
      },
      approval_confidence: approved ? 'High' : 'Low',
    },
  }
}
