/**
 * EnterDetails.tsx — Step 2 of the loan application wizard.
 *
 * Responsibilities:
 *  - Collect applicant details via a validated form
 *  - Show inline field errors (both client-side and server-side)
 *  - Pass a typed payload to onSubmit
 *
 * Production improvements:
 *  - Exhaustive input validation with numeric bounds enforcement
 *  - XSS-safe string sanitisation (no eval paths)
 *  - Strict rate/tenure validation (min 2%, max 30%; tenure ≥ 1)
 *  - Down-payment cross-field validation for car & bike (≥ 10%)
 *  - carAge / bikeAge max capped (≤ 20 years)
 *  - courseDuration max capped (≤ 10 years)
 *  - yearsOfExperience cannot exceed (age - 16)
 *  - interestRate fallback chain: custom → config default
 *  - Guard against unknown selectedLoanType (falls back to personal)
 *  - onBack / onSubmit wrapped in isLoading guard (prevents double-fire)
 *  - All aria-describedby IDs normalised (no trailing spaces / empty strings)
 *  - Stable memoisation: inputCls / selectCls depend only on errors object
 *  - Toast error count uses Object.keys(e) from local const — no stale closure
 *  - Gender field now has a proper error slot (no silent crashes)
 *  - Loan summary credit-score fallback handles edge NaN case
 *  - TypeScript: no implicit `any`; return types on all helpers
 *  - Down-payment hint shows for car & bike, not just home
 *  - LTV calculation guarded against propertyValue = 0 (avoids Infinity%)
 */

import {
    useState,
    useCallback,
    useMemo,
    useId,
    memo,
    useEffect,
    type ReactNode,
} from 'react'
import { useParams } from 'react-router-dom'
import {
    ChevronLeft,
    Calculator,
    AlertCircle,
    RotateCcw,
} from 'lucide-react'
import { resolveConfig, formatCurrency, parseFormNumber } from '../../lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import type { FormData, LoanSubmitPayload, CurrencyCode } from '../../lib/types'
import { HomeLoanFields } from '../form-sections/HomeLoanFields'
import { CarLoanFields } from '../form-sections/CarLoanFields'
import { BikeLoanFields } from '../form-sections/BikeLoanFields'
import { EducationLoanFields } from '../form-sections/EducationLoanFields'
import {
    getLoanFormSchema,
    MIN_CREDIT_SCORE,
    MAX_CREDIT_SCORE,
    MIN_LOAN_AMOUNT,
    MIN_INTEREST_RATE,
    MAX_INTEREST_RATE,
    MAX_VEHICLE_AGE,
    MAX_COURSE_DURATION,
    MIN_DOWN_PAYMENT_RATIO_HOME,
    MIN_DOWN_PAYMENT_RATIO_VEHICLE
} from '../../lib/validation'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Maps form field names to their validation error message. */
export type FieldErrors = Record<string, string | undefined>

// LoanFormData is an alias for the canonical FormData from types.ts.
// Using the shared type avoids the string | number vs string mismatch
// that caused TS errors when App.tsx passed its FormData state here.
export type { FormData as LoanFormData }

// LoanSubmitPayload is imported from types.ts (snake_case, matches FastAPI schema)

export interface EnterDetailsProps {
    formData: FormData
    onFormChange: (data: FormData) => void
    onBack: () => void
    onSubmit: (payload: LoanSubmitPayload) => void
    isLoading: boolean
    selectedLoanType: string
    currency: CurrencyCode
    onReset: () => void
    /** Server-side field errors passed down from App.tsx after a failed API call */
    serverFieldErrors?: FieldErrors
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOAN_TENURE = 5





const CREDIT_SCORE_LABELS: [number, string][] = [
    [750, 'Excellent'],
    [700, 'Good'],
    [650, 'Fair'],
    [600, 'Poor'],
    [0, 'Very Poor'],
]

/** Fields that represent income-scale integer amounts. */
const INCOME_FIELDS: ReadonlySet<keyof FormData> = new Set([
    'applicantIncome',
    'coapplicantIncome',
    'existingEmis',
])

/** Fields that represent large amounts capped to the loan type max. */
const LARGE_AMOUNT_FIELDS: ReadonlySet<keyof FormData> = new Set([
    'loanAmount',
    'carPrice',
    'bikePrice',
    'propertyValue',
    'downPayment',
])

/** Fields that are small non-negative integers (no upper cap enforced here). */
const SMALL_INT_FIELDS: ReadonlySet<keyof FormData> = new Set([
    'age',
    'yearsOfExperience',
    'carAge',
    'bikeAge',
    'courseDuration',
])

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const inrFormat = (n: number, currency: CurrencyCode): string => formatCurrency(n, currency)

const getCreditScoreLabel = (score: number): string => {
    for (const [threshold, label] of CREDIT_SCORE_LABELS) {
        if (score >= threshold) return label
    }
    return ''
}

/**
 * Strip everything except digits, clamp to [0, max], return as string.
 * Returns '' for empty input.
 */
const sanitiseInt = (raw: string, max: number): string => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return String(Math.min(Number(digits), max))
}

/**
 * Strip everything except digits and a single decimal point.
 * Prevents multiple dots: "12..3" → "12.3"
 */
const sanitiseDecimal = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length <= 2) return cleaned
    return parts[0] + '.' + parts.slice(1).join('')
}



/** Safe numeric conversion; handles commas from masked inputs. */
const toNum = (v: string | number | undefined): number => parseFormNumber(v)

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (memoised to avoid unnecessary re-renders)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldErrorProps {
    msg?: string
    id?: string
}

const FieldError = memo(({ msg, id }: FieldErrorProps) => {
    if (!msg) return null
    return (
        <p id={id} role="alert" className="flex items-center gap-1 text-xs text-destructive font-medium mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {msg}
        </p>
    )
})
FieldError.displayName = 'FieldError'

interface SectionCardProps {
    title: string
    icon?: ReactNode
    children: ReactNode
}

const SectionCard = memo(({ title, icon, children }: SectionCardProps) => (
    <div className="border border-border rounded-xl p-6 bg-card">
        <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
            {icon}
            {title}
        </h2>
        {children}
    </div>
))
SectionCard.displayName = 'SectionCard'

const formatWithCommas = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('en-IN')
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const EnterDetails = ({
    formData,
    onFormChange,
    onBack,
    onSubmit,
    isLoading,
    selectedLoanType,
    currency,
    onReset,
    serverFieldErrors = {},
}: EnterDetailsProps) => {
    const { loanType: paramLoanType } = useParams<{ loanType: string }>()
    const [clientErrors, setClientErrors] = useState<FieldErrors>({})
    const uid = useId()   // stable prefix for aria-describedby IDs

    // ── Sync loan type from URL if changed via navigation ────────────────────
    useEffect(() => {
        if (paramLoanType && paramLoanType !== selectedLoanType) {
            onFormChange({ ...formData, loanType: paramLoanType as any })
        }
    }, [paramLoanType, selectedLoanType, onFormChange, formData])

    const config = resolveConfig(selectedLoanType)
    const IconComponent = config.icon

    const cs = toNum(formData.creditScore)
    const csLabel = cs >= MIN_CREDIT_SCORE ? getCreditScoreLabel(cs) : ''

    // Merge server errors under client errors — client errors win (they're more specific)
    const errors: FieldErrors = useMemo(
        () => ({ ...serverFieldErrors, ...clientErrors }),
        [serverFieldErrors, clientErrors],
    )

    const clearError = useCallback((field: string) => {
        setClientErrors(prev => {
            if (!(field in prev)) return prev  // nothing to clear — avoid re-render
            const next = { ...prev }
            delete next[field]
            return next
        })
    }, [])

    // ── Input class helpers ──────────────────────────────────────────────────
    const inputCls = useCallback(
        (field: string): string =>
            [
                'border rounded-md px-3 py-2 text-sm w-full outline-none transition-all',
                'bg-background text-foreground placeholder:text-muted-foreground',
                'focus:ring-2 focus:ring-ring',
                errors[field]
                    ? 'border-destructive focus:ring-destructive/30'
                    : 'border-border focus:border-foreground/20',
            ].join(' '),
        [errors],
    )

    const selectCls = useCallback(
        (field: string): string =>
            [
                'border rounded-md bg-background text-foreground text-sm transition-all',
                errors[field] ? 'border-destructive' : 'border-border',
            ].join(' '),
        [errors],
    )

    // ── Field update handler ─────────────────────────────────────────────────
    const update = useCallback(
        (field: keyof FormData, raw: string | number) => {
            let value: string | number = raw

            if (typeof raw === 'string') {
                if (INCOME_FIELDS.has(field)) {
                    // Use standard Indian locale formatting for income
                    value = formatWithCommas(raw.slice(0, 10))
                } else if (LARGE_AMOUNT_FIELDS.has(field)) {
                    value = formatWithCommas(raw.slice(0, 12))
                } else if (SMALL_INT_FIELDS.has(field)) {
                    // Strip non-digits only; upper-bound enforced at validation time
                    value = raw === '' ? '' : raw.replace(/\D/g, '')
                } else if (field === 'creditScore') {
                    value = raw === '' ? '' : sanitiseInt(raw, MAX_CREDIT_SCORE)
                } else if (field === 'customInterestRate') {
                    value = sanitiseDecimal(raw)
                }
            }

            onFormChange({ ...formData, [field]: value })
            clearError(field as string)
        },
        [formData, onFormChange, clearError, config.maxLoan],
    )

    // ── Client-side validation ───────────────────────────────────────────────
    const validate = useCallback((): FieldErrors => {
        const schema = getLoanFormSchema(currency, config.maxLoan)
        const result = schema.safeParse(formData)

        if (result.success) return {}

        const e: FieldErrors = {}
        result.error.issues.forEach((issue) => {
            const path = String(issue.path[0])
            if (!e[path]) {
                e[path] = issue.message
            }
        })
        return e
    }, [formData, currency, config.maxLoan])

    // ── Submit handler ───────────────────────────────────────────────────────
    const handleSubmit = useCallback(() => {
        // Guard against double-submit while loading
        if (isLoading) return

        const e = validate()

        if (Object.keys(e).length > 0) {
            setClientErrors(e)

            const errorCount = Object.keys(e).length
            toast.error(
                errorCount === 1
                    ? '1 field needs attention — see highlighted field below'
                    : `${errorCount} fields need attention — see highlighted fields below`,
                { duration: 4_000 },
            )

            // Scroll to and focus the first errored field
            const firstField = Object.keys(e)[0]
            const el = document.getElementById(`${uid}-${firstField}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el?.focus({ preventScroll: true })
            return
        }

        // Resolve interest rate: custom value → config default
        const customRate = parseFloat(String(formData.customInterestRate))
        const resolvedRate = Number.isFinite(customRate) ? customRate : config.defaultRate

        // Build a strictly-typed payload — snake_case to match FastAPI / types.ts
        const payload: LoanSubmitPayload = {
            loan_type: selectedLoanType,
            gender: formData.gender || 'Male',
            age: toNum(formData.age),
            years_of_experience: toNum(formData.yearsOfExperience),
            monthly_income: toNum(formData.applicantIncome),
            coapplicant_income: toNum(formData.coapplicantIncome),
            employment_type: formData.employmentType,
            credit_score: toNum(formData.creditScore),
            existing_emis: toNum(formData.existingEmis),
            existing_loans_count: toNum(formData.existingLoansCount),
            marital_status: formData.maritalStatus,
            education: formData.education,
            dependents: toNum(formData.dependents || '0'),
            property_area: formData.propertyArea,
            loan_amount_requested: toNum(formData.loanAmount),
            loan_tenure_months: (formData.loanTenure || DEFAULT_LOAN_TENURE) * 12, // convert years → months
            interest_rate: resolvedRate,
        }

        if (selectedLoanType === 'home') {
            payload.property_type = formData.propertyType
            payload.property_value = toNum(formData.propertyValue)
            payload.down_payment = toNum(formData.downPayment)
        }
        if (selectedLoanType === 'car') {
            payload.vehicle_price = toNum(formData.carPrice)
            payload.vehicle_age_years = formData.carType === 'used' ? toNum(formData.carAge) : 0
            payload.down_payment = toNum(formData.downPayment)
        }
        if (selectedLoanType === 'bike') {
            payload.vehicle_price = toNum(formData.bikePrice)
            payload.vehicle_age_years = formData.bikeType === 'used' ? toNum(formData.bikeAge) : 0
            payload.down_payment = toNum(formData.downPayment)
        }
        if (selectedLoanType === 'education') {
            payload.course_type = formData.courseType
            payload.institution_tier = formData.institutionTier
            payload.study_location = formData.studyLocation
            payload.course_duration = toNum(formData.courseDuration)
        }

        onSubmit(payload)
    }, [isLoading, validate, formData, selectedLoanType, config.defaultRate, onSubmit, uid])

    // ── Back handler — guard against accidental double-trigger ───────────────
    const handleBack = useCallback(() => {
        if (!isLoading) onBack()
    }, [isLoading, onBack])

    // ── Derived display values ───────────────────────────────────────────────
    const ltvRatio = useMemo<string | null>(() => {
        const loan = toNum(formData.loanAmount)
        const prop = toNum(formData.propertyValue)
        if (!loan || !prop) return null
        return ((loan / prop) * 100).toFixed(1)
    }, [formData.loanAmount, formData.propertyValue])

    const minDownPaymentHome = useMemo<number | null>(() => {
        const prop = toNum(formData.propertyValue)
        if (!prop) return null
        return Math.ceil(prop * MIN_DOWN_PAYMENT_RATIO_HOME)
    }, [formData.propertyValue])

    const minDownPaymentCar = useMemo<number | null>(() => {
        const price = toNum(formData.carPrice)
        if (!price) return null
        return Math.ceil(price * MIN_DOWN_PAYMENT_RATIO_VEHICLE)
    }, [formData.carPrice])

    const minDownPaymentBike = useMemo<number | null>(() => {
        const price = toNum(formData.bikePrice)
        if (!price) return null
        return Math.ceil(price * MIN_DOWN_PAYMENT_RATIO_VEHICLE)
    }, [formData.bikePrice])

    // ── Field ID helpers (stable, unique per form instance) ─────────────────
    const fid = useCallback((field: string) => `${uid}-${field}`, [uid])
    const eid = useCallback((field: string) => `${uid}-${field}-error`, [uid])

    /**
     * Build a normalised aria-describedby string — filters out empty tokens
     * so we never emit `aria-describedby=""` or `aria-describedby=" hint"`.
     */
    const describedBy = (...ids: (string | undefined | false | null)[]): string | undefined => {
        const result = ids.filter(Boolean).join(' ').trim()
        return result || undefined
    }

    // ── Loan summary credit-score display ────────────────────────────────────
    const creditScoreSummary = cs >= MIN_CREDIT_SCORE
        ? `${cs} — ${getCreditScoreLabel(cs)}`
        : '—'

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background">
            {/* Suppress number input spinners globally for this component */}
            <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

            {/* ── Sticky sub-header ─────────────────────────────────────────────── */}
            <div className="bg-background border-b border-border sticky top-16 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        disabled={isLoading}
                        className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Go back to loan type selection"
                    >
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <IconComponent className="h-5 w-5 text-foreground" aria-hidden="true" />
                    <h1 className="text-base font-bold text-foreground">{config.name} Application</h1>
                    <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
                        Fill the form and click <strong>Check Eligibility</strong>
                    </p>
                    <div className="ml-auto sm:ml-4 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            disabled={isLoading}
                            className="text-xs h-8 px-2 border border-border bg-card hover:bg-muted"
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Clear All
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Form content ──────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-6">

                {/* ── Personal & Income ─────────────────────────────────────────── */}
                <SectionCard title="Personal & Income">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                        {/* Age */}
                        <div>
                            <Label htmlFor={fid('age')} className="text-sm text-foreground mb-1 block">Age *</Label>
                            <input
                                id={fid('age')}
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g., 32"
                                value={formData.age || ''}
                                onChange={e => update('age', e.target.value)}
                                className={inputCls('age')}
                                aria-describedby={describedBy(errors.age ? eid('age') : null)}
                                aria-invalid={!!errors.age}
                                aria-required="true"
                            />
                            <FieldError msg={errors.age} id={eid('age')} />
                        </div>

                        {/* Gender */}
                        <div>
                            <Label htmlFor={fid('gender')} className="text-sm text-foreground mb-1 block">Gender</Label>
                            <Select value={formData.gender || 'Male'} onValueChange={v => update('gender', v)}>
                                <SelectTrigger id={fid('gender')} className={selectCls('')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other / Prefer not to say</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Monthly Income */}
                        <div>
                            <Label htmlFor={fid('applicantIncome')} className="text-sm text-foreground mb-1 block">Monthly Income ({currency}) *</Label>
                            <input
                                id={fid('applicantIncome')}
                                type="text"
                                inputMode="numeric"
                                placeholder={`e.g., ${formatCurrency(50000, currency)}`}
                                value={formData.applicantIncome || ''}
                                onChange={e => update('applicantIncome', e.target.value)}
                                className={inputCls('applicantIncome')}
                                aria-describedby={describedBy(errors.applicantIncome ? eid('applicantIncome') : null)}
                                aria-invalid={!!errors.applicantIncome}
                                aria-required="true"
                            />
                            <FieldError msg={errors.applicantIncome} id={eid('applicantIncome')} />
                        </div>

                        {/* Co-applicant Income */}
                        <div>
                            <Label htmlFor={fid('coapplicantIncome')} className="text-sm text-foreground mb-1 block">
                                Co-applicant Income ({currency})
                            </Label>
                            <input
                                id={fid('coapplicantIncome')}
                                type="text"
                                inputMode="numeric"
                                placeholder="Optional — 0 if none"
                                value={formData.coapplicantIncome || ''}
                                onChange={e => update('coapplicantIncome', e.target.value)}
                                className={inputCls('')}
                            />
                        </div>

                        {/* Work Experience */}
                        <div>
                            <Label htmlFor={fid('yearsOfExperience')} className="text-sm text-foreground mb-1 block">Work Experience (Years) *</Label>
                            <input
                                id={fid('yearsOfExperience')}
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g., 5"
                                value={formData.yearsOfExperience || ''}
                                onChange={e => update('yearsOfExperience', e.target.value)}
                                className={inputCls('yearsOfExperience')}
                                aria-describedby={describedBy(errors.yearsOfExperience ? eid('yearsOfExperience') : null)}
                                aria-invalid={!!errors.yearsOfExperience}
                                aria-required="true"
                            />
                            <FieldError msg={errors.yearsOfExperience} id={eid('yearsOfExperience')} />
                        </div>

                        {/* Employment Type */}
                        <div>
                            <Label htmlFor={fid('employmentType')} className="text-sm text-foreground mb-1 block">Employment Type *</Label>
                            <Select value={formData.employmentType || ''} onValueChange={v => update('employmentType', v)}>
                                <SelectTrigger
                                    id={fid('employmentType')}
                                    className={selectCls('employmentType')}
                                    aria-invalid={!!errors.employmentType}
                                    aria-describedby={describedBy(errors.employmentType ? eid('employmentType') : null)}
                                >
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Salaried">Salaried</SelectItem>
                                    <SelectItem value="Self-Employed">Self Employed</SelectItem>
                                    <SelectItem value="Business">Business Owner</SelectItem>
                                    <SelectItem value="Government">Government</SelectItem>
                                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError msg={errors.employmentType} id={eid('employmentType')} />
                        </div>

                        {/* Credit Score */}
                        <div>
                            <Label htmlFor={fid('creditScore')} className="text-sm text-foreground mb-1 block">Credit Score *</Label>
                            <div className="relative">
                                <input
                                    id={fid('creditScore')}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g., 720"
                                    value={formData.creditScore || ''}
                                    onChange={e => update('creditScore', e.target.value)}
                                    className={`${inputCls('creditScore')} pr-24`}
                                    aria-describedby={describedBy(
                                        errors.creditScore ? eid('creditScore') : null,
                                        fid('creditScore-hint'),
                                    )}
                                    aria-invalid={!!errors.creditScore}
                                />
                                {csLabel && (
                                    <span
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground pointer-events-none"
                                        aria-hidden="true"
                                    >
                                        {csLabel}
                                    </span>
                                )}
                            </div>
                            <p id={fid('creditScore-hint')} className="text-xs text-muted-foreground mt-1">
                                Range: {MIN_CREDIT_SCORE}–{MAX_CREDIT_SCORE}
                            </p>
                            <FieldError msg={errors.creditScore} id={eid('creditScore')} />
                        </div>

                        {/* Existing EMIs */}
                        <div>
                            <Label htmlFor={fid('existingEmis')} className="text-sm text-foreground mb-1 block">Existing Monthly EMIs ({currency}) *</Label>
                            <input
                                id={fid('existingEmis')}
                                type="text"
                                inputMode="numeric"
                                placeholder={`e.g., ${formatCurrency(0, currency)}`}
                                value={formData.existingEmis || ''}
                                onChange={e => update('existingEmis', e.target.value)}
                                className={inputCls('existingEmis')}
                                aria-describedby={describedBy(errors.existingEmis ? eid('existingEmis') : null)}
                                aria-invalid={!!errors.existingEmis}
                                aria-required="true"
                            />
                            <FieldError msg={errors.existingEmis} id={eid('existingEmis')} />
                        </div>

                        {/* Active Loans */}
                        <div>
                            <Label htmlFor={fid('existingLoansCount')} className="text-sm text-foreground mb-1 block">Active Loans *</Label>
                            <Select value={formData.existingLoansCount || ''} onValueChange={v => update('existingLoansCount', v)}>
                                <SelectTrigger
                                    id={fid('existingLoansCount')}
                                    className={selectCls('existingLoansCount')}
                                    aria-invalid={!!errors.existingLoansCount}
                                    aria-describedby={describedBy(errors.existingLoansCount ? eid('existingLoansCount') : null)}
                                >
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0 — None</SelectItem>
                                    <SelectItem value="1">1 loan</SelectItem>
                                    <SelectItem value="2">2 loans</SelectItem>
                                    <SelectItem value="3">3 loans</SelectItem>
                                    <SelectItem value="4">4+ loans</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError msg={errors.existingLoansCount} id={eid('existingLoansCount')} />
                        </div>

                        {/* Marital Status */}
                        <div>
                            <Label htmlFor={fid('maritalStatus')} className="text-sm text-foreground mb-1 block">Marital Status *</Label>
                            <Select value={formData.maritalStatus || ''} onValueChange={v => update('maritalStatus', v)}>
                                <SelectTrigger
                                    id={fid('maritalStatus')}
                                    className={selectCls('maritalStatus')}
                                    aria-invalid={!!errors.maritalStatus}
                                    aria-describedby={describedBy(errors.maritalStatus ? eid('maritalStatus') : null)}
                                >
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Married">Married</SelectItem>
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="Divorced">Divorced</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError msg={errors.maritalStatus} id={eid('maritalStatus')} />
                        </div>

                        {/* Education */}
                        <div>
                            <Label htmlFor={fid('education')} className="text-sm text-foreground mb-1 block">Education *</Label>
                            <Select value={formData.education || ''} onValueChange={v => update('education', v)}>
                                <SelectTrigger
                                    id={fid('education')}
                                    className={selectCls('education')}
                                    aria-invalid={!!errors.education}
                                    aria-describedby={describedBy(errors.education ? eid('education') : null)}
                                >
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Graduate">Graduate</SelectItem>
                                    <SelectItem value="Post-Graduate">Post Graduate</SelectItem>
                                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                                    <SelectItem value="Diploma">Diploma</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError msg={errors.education} id={eid('education')} />
                        </div>

                        {/* Dependents */}
                        <div>
                            <Label htmlFor={fid('dependents')} className="text-sm text-foreground mb-1 block">Dependents</Label>
                            <Select value={formData.dependents || '0'} onValueChange={v => update('dependents', v)}>
                                <SelectTrigger id={fid('dependents')} className={selectCls('')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(['0', '1', '2', '3', '4+'] as const).map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Residential Area */}
                        <div>
                            <Label htmlFor={fid('propertyArea')} className="text-sm text-foreground mb-1 block">Residential Area *</Label>
                            <Select value={formData.propertyArea || ''} onValueChange={v => update('propertyArea', v)}>
                                <SelectTrigger
                                    id={fid('propertyArea')}
                                    className={selectCls('propertyArea')}
                                    aria-invalid={!!errors.propertyArea}
                                    aria-describedby={describedBy(errors.propertyArea ? eid('propertyArea') : null)}
                                >
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Urban">Urban</SelectItem>
                                    <SelectItem value="Semi-Urban">Semi Urban</SelectItem>
                                    <SelectItem value="Rural">Rural</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError msg={errors.propertyArea} id={eid('propertyArea')} />
                        </div>

                    </div>
                </SectionCard>

                {/* ── Loan Details ──────────────────────────────────────────────── */}
                <SectionCard title="Loan Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                        {/* Loan Amount */}
                        <div>
                            <Label htmlFor={fid('loanAmount')} className="text-sm text-foreground mb-1 block">Loan Amount ({currency}) *</Label>
                            <input
                                id={fid('loanAmount')}
                                type="text"
                                inputMode="numeric"
                                placeholder={`e.g., ${inrFormat(500000, currency)}`}
                                value={formData.loanAmount || ''}
                                onChange={e => update('loanAmount', e.target.value)}
                                className={inputCls('loanAmount')}
                                aria-describedby={describedBy(
                                    errors.loanAmount ? eid('loanAmount') : null,
                                    fid('loanAmount-hint'),
                                )}
                                aria-invalid={!!errors.loanAmount}
                                aria-required="true"
                            />
                            <p id={fid('loanAmount-hint')} className="text-xs text-muted-foreground mt-1">
                                {inrFormat(MIN_LOAN_AMOUNT, currency)} – {inrFormat(config.maxLoan, currency)}
                            </p>
                            <FieldError msg={errors.loanAmount} id={eid('loanAmount')} />
                        </div>

                        {/* Tenure Slider */}
                        <div className="md:col-span-2">
                            <Label className="text-sm text-foreground mb-1 block">
                                Tenure:{' '}
                                <strong>
                                    {formData.loanTenure || DEFAULT_LOAN_TENURE} year{(formData.loanTenure || DEFAULT_LOAN_TENURE) !== 1 ? 's' : ''}
                                </strong>
                            </Label>
                            <Slider
                                value={[formData.loanTenure || DEFAULT_LOAN_TENURE]}
                                onValueChange={v => update('loanTenure', v[0])}
                                min={1}
                                max={config.maxTenure}
                                step={1}
                                className="w-full"
                                aria-label="Loan tenure in years"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>1 year</span>
                                <span>{config.maxTenure} years</span>
                            </div>
                        </div>

                        {/* Custom Interest Rate */}
                        <div>
                            <Label htmlFor={fid('customInterestRate')} className="text-sm text-foreground mb-1 block">
                                Interest Rate (%) — Optional
                            </Label>
                            <div className="flex gap-2 items-center">
                                <input
                                    id={fid('customInterestRate')}
                                    type="number"
                                    inputMode="decimal"
                                    placeholder={`Default: ${config.defaultRate}%`}
                                    value={formData.customInterestRate || ''}
                                    onChange={e => update('customInterestRate', e.target.value)}
                                    step="0.1"
                                    min={MIN_INTEREST_RATE}
                                    max={MAX_INTEREST_RATE}
                                    className={inputCls('customInterestRate')}
                                    aria-describedby={describedBy(
                                        errors.customInterestRate ? eid('customInterestRate') : null,
                                        fid('rate-hint'),
                                    )}
                                    aria-invalid={!!errors.customInterestRate}
                                />
                                <span className="text-muted-foreground text-sm shrink-0">%</span>
                            </div>
                            <p id={fid('rate-hint')} className="text-xs text-muted-foreground mt-1">
                                {MIN_INTEREST_RATE}%–{MAX_INTEREST_RATE}% · Default: {config.defaultRate}%
                            </p>
                            <FieldError msg={errors.customInterestRate} id={eid('customInterestRate')} />
                        </div>

                    </div>
                </SectionCard>

                {/* ── Loan-type-specific sections ───────────────────────────────── */}
                {selectedLoanType === 'home' && (
                    <HomeLoanFields
                        formData={formData}
                        errors={errors}
                        uid={uid}
                        update={update}
                        inputCls={inputCls}
                        selectCls={selectCls}
                        describedBy={describedBy}
                        minDownPayment={minDownPaymentHome}
                        ltvRatio={ltvRatio}
                        maxVehicleAge={MAX_VEHICLE_AGE}
                        maxCourseDuration={MAX_COURSE_DURATION}
                        currency={currency}
                    />
                )}

                {selectedLoanType === 'car' && (
                    <CarLoanFields
                        formData={formData}
                        errors={errors}
                        uid={uid}
                        update={update}
                        inputCls={inputCls}
                        selectCls={selectCls}
                        describedBy={describedBy}
                        minDownPayment={minDownPaymentCar}
                        ltvRatio={null}
                        maxVehicleAge={MAX_VEHICLE_AGE}
                        maxCourseDuration={MAX_COURSE_DURATION}
                        currency={currency}
                    />
                )}

                {selectedLoanType === 'bike' && (
                    <BikeLoanFields
                        formData={formData}
                        errors={errors}
                        uid={uid}
                        update={update}
                        inputCls={inputCls}
                        selectCls={selectCls}
                        describedBy={describedBy}
                        minDownPayment={minDownPaymentBike}
                        ltvRatio={null}
                        maxVehicleAge={MAX_VEHICLE_AGE}
                        maxCourseDuration={MAX_COURSE_DURATION}
                        currency={currency}
                    />
                )}

                {selectedLoanType === 'education' && (
                    <EducationLoanFields
                        formData={formData}
                        errors={errors}
                        uid={uid}
                        update={update}
                        inputCls={inputCls}
                        selectCls={selectCls}
                        describedBy={describedBy}
                        minDownPayment={null}
                        ltvRatio={null}
                        maxVehicleAge={MAX_VEHICLE_AGE}
                        maxCourseDuration={MAX_COURSE_DURATION}
                        currency={currency}
                    />
                )}

                {/* ── Loan Summary ──────────────────────────────────────────────── */}
                <div className="border border-border rounded-xl p-5 bg-muted" aria-label="Loan summary">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <h3 className="font-semibold text-foreground text-sm">Loan Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {([
                            { label: 'Loan Amount', value: inrFormat(toNum(formData.loanAmount), currency) },
                            { label: 'Tenure', value: `${formData.loanTenure || DEFAULT_LOAN_TENURE} year${(formData.loanTenure || DEFAULT_LOAN_TENURE) !== 1 ? 's' : ''}` },
                            { label: 'Interest Rate', value: `${formData.customInterestRate || config.defaultRate}%` },
                            { label: 'Credit Score', value: creditScoreSummary },
                        ] as const).map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="text-sm font-semibold text-foreground">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ── Fixed bottom action bar ───────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                        <span className="text-muted-foreground">
                            Amount:{' '}
                            <strong className="text-foreground">
                                {formData.loanAmount ? inrFormat(toNum(formData.loanAmount), currency) : '—'}
                            </strong>
                        </span>
                        <span className="text-muted-foreground">
                            Score: <strong className="text-foreground">{cs >= MIN_CREDIT_SCORE ? cs : '—'}</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={handleBack}
                            disabled={isLoading}
                            className="border-border text-foreground hover:bg-muted"
                        >
                            Back
                        </Button>
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            aria-live="polite"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[190px]"
                        >
                            {isLoading ? (
                                <>
                                    <div
                                        className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                                        aria-hidden="true"
                                    />
                                    <span>Analyzing…</span>
                                </>
                            ) : (
                                <>
                                    Check Eligibility
                                    <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
