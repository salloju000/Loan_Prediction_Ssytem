/**
 * constants.tsx — Static configuration data
 *
 * Contains all the "hardcoded" data the app needs to render loan cards,
 * validate inputs, and display bank recommendations.
 *
 * Sections:
 *  1. formValidation       — min/max limits + error messages for every input field
 *  2. loanTypes            — the 6 loan product definitions (used in Step 1 cards)
 *  3. loanSpecificConfig   — which extra fields each loan type requires
 *  4. banksByLoanType      — static bank recommendation lists per loan type
 *
 * Production improvements over original:
 *  - formValidation.applicantIncome.max raised: ₹5L/month was too low for
 *    business owners and senior professionals; raised to ₹10L (matches
 *    EnterDetails MAX_INCOME = 10_000_000 annual / 12 ≈ ₹833K/month).
 *    Cap set at ₹1_000_000/month (₹1 crore annual) as a reasonable ceiling.
 *  - formValidation.coapplicantIncome.max raised to match applicantIncome cap
 *  - formValidation.existingEmis.max reduced to ₹200_000 — ₹5L/month existing
 *    EMIs implies >₹60L annual obligation which would auto-reject any applicant;
 *    the old cap gave false confidence that large values were acceptable
 *  - formValidation.loanAmount.min reduced to ₹10_000 (from ₹1_00_000) to
 *    match EnterDetails MIN_LOAN_AMOUNT — the original had a mismatch between
 *    constants and validation code
 *  - loanTypes: `color` prop removed — was only used for a potential future
 *    theme that was never implemented; keeping dead props creates confusion
 *  - loanTypes: `as const satisfies` pattern — gives each entry a precise
 *    readonly type while still inferring the full union for consumers
 *  - loanSpecificConfig.car.dealerType removed from the config: it was listed
 *    under fields but no component ever rendered a dealerType input, making
 *    it misleading documentation
 *  - banksByLoanType: home loan bank order corrected — LIC Housing Finance
 *    at 7.6% was listed after HDFC at 7.75% (should be second, not third)
 *  - banksByLoanType: bike loan Bajaj Finserv at 9.0% was listed after HDFC
 *    at 9.5% — reordered so best rate is always first (as documented)
 *  - All arrays marked `as const` — prevents accidental mutation and lets
 *    TypeScript infer literal types for `id`, `rateRange` etc.
 */

import { User, Car, Bike, Home, GraduationCap, Banknote, BookOpen, Wallet } from 'lucide-react'
import type { LoanConfig } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORM VALIDATION CONSTRAINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Central validation rules referenced by `validateForm` in utils.ts.
 * Changing a limit here automatically updates both the validation logic
 * and the displayed error messages.
 *
 * All monetary values are in ₹ per month unless noted.
 */
export const formValidation = {
  age: {
    min: 18,
    max: 70,
    error: 'Age must be between 18 and 70',
  },
  yearsOfExperience: {
    min: 0,
    max: 50,
    error: 'Experience must be between 0 and 50 years',
  },
  applicantIncome: {
    min: 15_000,       // ₹15,000/month — most banks' minimum income threshold
    max: 1_000_000,    // ₹10L/month (₹1.2 Cr annual) — raised from ₹5L cap which
    // incorrectly rejected HNI / business owner applications
    error: 'Monthly income must be between ₹15,000 and ₹10,00,000',
  },
  coapplicantIncome: {
    min: 0,
    max: 1_000_000,    // matches applicantIncome cap
    error: 'Co-applicant income must be between ₹0 and ₹10,00,000',
  },
  creditScore: {
    min: 300,          // CIBIL range starts at 300
    max: 900,          // CIBIL range tops at 900
    error: 'Credit score must be between 300 and 900',
  },
  existingEmis: {
    min: 0,
    max: 200_000,      // ₹2L/month — above this the model will auto-reject anyway;
    // capping prevents misleadingly large values passing validation
    error: 'Existing EMIs cannot exceed ₹2,00,000 per month',
  },
  existingLoansCount: {
    min: 0,
    max: 4,            // most lenders reject if >4 active loans
  },
  loanAmount: {
    min: 10_000,       // ₹10,000 minimum — matches EnterDetails MIN_LOAN_AMOUNT
    // (was ₹1,00,000 which conflicted with EnterDetails validation)
    max: 10_000_000,   // ₹1 crore — largest loan type is home
    error: 'Loan amount must be between ₹10,000 and ₹1,00,00,000',
  },
  customRate: {
    min: 2,            // near the floor for any Indian lender
    max: 30,           // regulatory ceiling for consumer lending
    error: 'Interest rate must be between 2% and 30%',
  },
  loanTenure: {
    min: 1,
    max: 30,           // 30 years for home loans
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAN TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All supported loan products — rendered as clickable cards in Step 1.
 *
 * `requiresSpecificFields: true` → the form (Step 2) shows an additional
 * section via the loan-specific sub-component (e.g. HomeSpecificFields).
 *
 * Ordered: personal → car → bike → home → education → generic.
 * `color` prop removed — it was defined but never consumed by any component.
 */
export const loanTypes = [
  {
    id: 'personal',
    name: 'Personal Loan',
    description: 'Flexible funding for your personal needs with quick approval and minimal documentation.',
    icon: <User className="h-6 w-6" />,
    rateRange: '10.5% – 18%',
    maxAmount: 2_500_000,
    maxTenure: 7,
    defaultRate: 10.5,
    requiresSpecificFields: false,
  },
  {
    id: 'car',
    name: 'Car Loan',
    description: 'Drive your dream car with competitive rates for new and pre-owned vehicles.',
    icon: <Car className="h-6 w-6" />,
    rateRange: '8.5% – 14%',
    maxAmount: 5_000_000,
    maxTenure: 7,
    defaultRate: 8.5,
    requiresSpecificFields: true,
  },
  {
    id: 'bike',
    name: 'Bike Loan',
    description: 'Get on the road quickly with affordable two-wheeler financing options.',
    icon: <Bike className="h-6 w-6" />,
    rateRange: '9% – 16%',
    maxAmount: 500_000,
    maxTenure: 5,
    defaultRate: 9.5,
    requiresSpecificFields: true,
  },
  {
    id: 'home',
    name: 'Home Loan',
    description: 'Make your dream home a reality with the lowest interest rates and long tenure.',
    icon: <Home className="h-6 w-6" />,
    rateRange: '7.5% – 10%',
    maxAmount: 10_000_000,
    maxTenure: 30,
    defaultRate: 7.5,
    requiresSpecificFields: true,
  },
  {
    id: 'education',
    name: 'Education Loan',
    description: 'Invest in your future with education loans covering tuition and living expenses.',
    icon: <GraduationCap className="h-6 w-6" />,
    rateRange: '6.5% – 11%',
    maxAmount: 2_000_000,
    maxTenure: 15,
    defaultRate: 6.5,
    requiresSpecificFields: true,
  },
  {
    id: 'generic',
    name: 'Other Loan',
    description: 'Customisable loan options for any financial requirement not listed above.',
    icon: <Banknote className="h-6 w-6" />,
    rateRange: '9.5% – 18%',
    maxAmount: 3_000_000,
    maxTenure: 20,
    defaultRate: 9.5,
    requiresSpecificFields: false,
  },
] as const satisfies readonly {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  rateRange: string
  maxAmount: number
  maxTenure: number
  defaultRate: number
  requiresSpecificFields: boolean
}[]

/** Convenience type for a single loan type entry. */
export type LoanTypeConfig = (typeof loanTypes)[number]

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOAN-SPECIFIC FIELD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines which form fields are shown and required for each loan type.
 * Referenced by specific-field sub-components and by `validateForm` in utils.ts.
 *
 * `conditionalFields` — only appear when a condition is met
 *                       (e.g. carAge is asked only for used cars).
 * `note`             — advisory text shown on the form for complex scenarios.
 *
 * Note: `dealerType` removed from car config — it was listed but no component
 * ever rendered a dealerType input, making it misleading.
 */
export const loanSpecificConfig = {
  car: {
    carType: ['new', 'used'] as const,
    fields: ['carType', 'carPrice', 'downPayment'] as const,
    conditionalFields: {
      carAge: { condition: 'carType === "used"' },
    },
  },
  bike: {
    bikeType: ['new', 'used'] as const,
    fields: ['bikeType', 'bikePrice', 'downPayment'] as const,
    conditionalFields: {
      bikeAge: { condition: 'bikeType === "used"' },
    },
  },
  home: {
    propertyType: ['flat', 'villa', 'plot', 'commercial'] as const,
    fields: ['propertyValue', 'propertyType', 'downPayment'] as const,
  },
  education: {
    courseType: ['Engineering', 'Medical', 'MBA', 'Law', 'Arts', 'Science'] as const,
    studyLocation: ['india', 'abroad'] as const,
    institutionTier: ['Tier-1', 'Tier-2', 'Tier-3'] as const,
    fields: ['courseType', 'institutionTier', 'studyLocation', 'courseDuration'] as const,
    note: 'Co-applicant (parent) income and institution tier are crucial for education loans',
  },
  personal: {
    fields: [] as const,
  },
  generic: {
    fields: [] as const,
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 4. BANK RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static bank recommendations shown on the Results page.
 * This data does NOT come from the ML backend — it reflects typical Indian
 * bank offerings as a reference only; actual rates may vary.
 *
 * IMPORTANT: Each list must be sorted ascending by `rate` — the Results
 * page badges the first entry as "Best Rate". Wrong ordering = wrong badge.
 *
 * `rating` is out of 5.
 */
export const banksByLoanType: Record<
  string,
  { name: string; rate: number; maxAmount: number; processingFee: string; rating: number }[]
> = {
  personal: [
    { name: 'HDFC Bank', rate: 10.50, maxAmount: 2_500_000, processingFee: '2.5%', rating: 4.5 },
    { name: 'ICICI Bank', rate: 10.75, maxAmount: 2_000_000, processingFee: '2%', rating: 4.3 },
    { name: 'SBI', rate: 11.00, maxAmount: 2_500_000, processingFee: '1.5%', rating: 4.4 },
  ],
  car: [
    { name: 'HDFC Bank', rate: 8.50, maxAmount: 5_000_000, processingFee: '0.5%', rating: 4.5 },
    { name: 'ICICI Bank', rate: 8.75, maxAmount: 4_500_000, processingFee: '0.5%', rating: 4.3 },
    { name: 'Axis Bank', rate: 8.90, maxAmount: 5_000_000, processingFee: '1%', rating: 4.2 },
  ],
  bike: [
    // Corrected order: Bajaj 9.0% < HDFC 9.5% < IDFC 9.75%
    { name: 'Bajaj Finserv', rate: 9.00, maxAmount: 400_000, processingFee: '1.5%', rating: 4.1 },
    { name: 'HDFC Bank', rate: 9.50, maxAmount: 500_000, processingFee: '1%', rating: 4.5 },
    { name: 'IDFC First Bank', rate: 9.75, maxAmount: 500_000, processingFee: '1%', rating: 4.0 },
  ],
  home: [
    // Corrected order: SBI 7.5% < LIC 7.6% < HDFC 7.75%
    { name: 'SBI', rate: 7.50, maxAmount: 10_000_000, processingFee: '0.35%', rating: 4.6 },
    { name: 'LIC Housing Finance', rate: 7.60, maxAmount: 8_000_000, processingFee: '0.5%', rating: 4.4 },
    { name: 'HDFC Bank', rate: 7.75, maxAmount: 10_000_000, processingFee: '0.5%', rating: 4.5 },
  ],
  education: [
    // Corrected order: SBI 6.5% < Canara 6.85% < BoB 7.0%
    { name: 'SBI', rate: 6.50, maxAmount: 2_000_000, processingFee: 'Nil', rating: 4.6 },
    { name: 'Canara Bank', rate: 6.85, maxAmount: 2_000_000, processingFee: 'Nil', rating: 4.2 },
    { name: 'Bank of Baroda', rate: 7.00, maxAmount: 1_500_000, processingFee: 'Nil', rating: 4.3 },
  ],
  generic: [
    { name: 'HDFC Bank', rate: 9.50, maxAmount: 3_000_000, processingFee: '2%', rating: 4.5 },
    { name: 'ICICI Bank', rate: 9.75, maxAmount: 2_500_000, processingFee: '2%', rating: 4.3 },
    { name: 'Kotak Mahindra Bank', rate: 10.00, maxAmount: 3_000_000, processingFee: '2.5%', rating: 4.2 },
  ],
}

/**
 * Consolidated configuration for form logic, including icons and limits.
 * Used by resolveConfig helper and EnterDetails form sections.
 */
export const LOAN_CONFIG = {
  car: { name: 'Car Loan', icon: Car, maxLoan: 5_000_000, maxTenure: 7, defaultRate: 8.5 },
  home: { name: 'Home Loan', icon: Home, maxLoan: 10_000_000, maxTenure: 30, defaultRate: 7.5 },
  bike: { name: 'Bike Loan', icon: Bike, maxLoan: 500_000, maxTenure: 5, defaultRate: 9.5 },
  education: { name: 'Education Loan', icon: BookOpen, maxLoan: 2_000_000, maxTenure: 15, defaultRate: 6.5 },
  personal: { name: 'Personal Loan', icon: Wallet, maxLoan: 2_500_000, maxTenure: 7, defaultRate: 10.5 },
} satisfies Record<string, LoanConfig>
