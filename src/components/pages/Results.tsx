/**
 * Results.tsx — Step 3: Loan eligibility result screen.
 *
 * Key behaviours:
 *  - Approved   → shows sanctioned amount, EMI breakdown, suggested banks
 *  - Rejected   → shows rejection reasons + actionable improvement tips
 *                 (banks are NOT shown — they are irrelevant until approved)
 *  - Offline    → mock banner shown when result.status === 'mock'
 *
 * Sub-components have been extracted to src/components/results/ for readability.
 */

import { useMemo, memo } from 'react'
import {
    AlertCircle, BadgePercent, BarChart3, CheckCircle2,
    ChevronLeft, ChevronRight, Clock, CreditCard,
    Download, FlaskConical, RotateCcw, ShieldAlert, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LoanPredictResponse, Bank, CurrencyCode, FormData } from '../../lib/types'
import { formatCurrency, parseFormNumber } from '../../lib/utils'

// Sub-components
import { CreditScoreBar } from '../results/CreditScoreBar'
import { ProbabilityRing } from '../results/ProbabilityRing'
import { EmiBreakdown } from '../results/EmiBreakdown'
import { ImprovementTips, buildImprovementTips } from '../results/ImprovementTips'
import { SuggestedBanks } from '../results/SuggestedBanks'
import { ResultsSkeleton } from '../results/ResultsSkeleton'
import { generateLoanReport } from '@/lib/pdfGenerator'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ResultsProps {
    result: LoanPredictResponse
    loanType: string
    /** Tenure in years the user selected — used to highlight the EMI table row */
    selectedTenure: number
    /**
     * Annual interest rate (%) from the form — either the user's custom rate
     * or the loan-type default. Passed from App.tsx so Results never needs to
     * guess or hardcode a fallback.
     */
    interestRate: number
    suggestedBanks?: Bank[]
    onBack: () => void
    onReset: () => void
    isLoading?: boolean
    currency: CurrencyCode
    formData: FormData
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CREDIT_SCORE_BANDS: [number, string][] = [
    [750, 'Excellent'],
    [700, 'Good'],
    [650, 'Fair'],
    [600, 'Poor'],
    [0, 'Very Poor'],
]

const getCreditScoreLabel = (score: number): string => {
    for (const [threshold, label] of CREDIT_SCORE_BANDS) {
        if (score >= threshold) return label
    }
    return 'Very Poor'
}

import { Info } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

const Card = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`border border-border rounded-xl p-6 bg-card ${className}`}>{children}</div>
))
Card.displayName = 'Card'

const Row = memo(({ label, value, bold = false, isRisk = false, tooltip }: {
    label: string
    value: string
    bold?: boolean
    isRisk?: boolean
    tooltip?: string
}) => (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0 text-sm">
        <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{label}</span>
            {tooltip && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                <Info className="h-3.5 w-3.5" />
                                <span className="sr-only">Explanation</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px] text-xs">
                            {tooltip}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
        <span className={`${bold ? 'font-bold' : ''} ${isRisk ? 'text-destructive' : 'text-foreground'}`}>
            {value}
        </span>
    </div>
))
Row.displayName = 'Row'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Results = ({
    result,
    loanType,
    selectedTenure,
    interestRate,
    suggestedBanks = [],
    onBack,
    onReset,
    isLoading = false,
    currency,
    formData,
}: ResultsProps) => {

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return <ResultsSkeleton />
    }

    // ── Null guard ─────────────────────────────────────────────────────────────
    if (!result) {
        return (
            <div className="max-w-3xl mx-auto p-6 border border-border rounded-xl text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-bold text-foreground mb-2">No Results Available</h3>
                <p className="text-muted-foreground mb-4">The prediction result is missing. Please try again.</p>
                <Button type="button" onClick={onReset} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" /> Try Again
                </Button>
            </div>
        )
    }

    // ── Destructure ────────────────────────────────────────────────────────────
    const approved = result.approved
    const probability = result.approval_probability
    const grade = result.loan_grade
    const sanctioned = result.sanctioned_amount
    const ratio = result.sanction_ratio
    const emi = result.monthly_emi
    const reasons = result.rejection_reasons
    const isMock = result.status === 'mock'

    const fh = result.breakdown.financial_health
    const cp = result.breakdown.credit_profile
    const lm = result.breakdown.loan_metrics

    const improvementTips = useMemo(
        () => !approved ? buildImprovementTips(reasons, result.breakdown) : [],
        [approved, reasons, result.breakdown],
    )

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Back */}
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                aria-label="Back to form"
            >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to Form
            </button>

            {/* Offline / mock banner */}
            {isMock && (
                <div className="border border-border rounded-lg px-4 py-3 flex items-start gap-3 text-sm bg-muted" role="status">
                    <FlaskConical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-foreground">
                        <strong>Estimated result</strong> — backend offline. Start with{' '}
                        <code className="font-mono bg-background px-1 rounded text-xs">uvicorn main:app --reload</code>
                        {' '}for real ML predictions.
                    </span>
                </div>
            )}

            {/* Hero card */}
            <Card>
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg border border-border bg-muted">
                            {approved
                                ? <CheckCircle2 className="h-7 w-7 text-foreground" aria-hidden="true" />
                                : <AlertCircle className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                            }
                        </div>
                        <div>
                            <div aria-live="assertive" role="status">
                                <h2 className={`text-2xl font-black ${approved ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {approved ? 'Loan Approved ✓' : 'Application Rejected'}
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {approved
                                    ? 'Your profile qualifies. Review the sanctioned details below.'
                                    : 'Your profile did not meet the criteria. See improvement tips below.'
                                }
                            </p>
                            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 border border-border rounded-full text-xs font-semibold text-foreground bg-muted">
                                <BarChart3 className="h-3 w-3" aria-hidden="true" />
                                {grade}
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <ProbabilityRing probability={probability} approved={approved} />
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Approval Confidence</p>
                    </div>
                </div>

                {/* Key numbers — approved only */}
                {approved && sanctioned > 0 && (
                    <div className="grid grid-cols-3 gap-0 mt-6 pt-6 border-t border-border">
                        {[
                            { label: 'Sanctioned Amount', value: formatCurrency(sanctioned, currency), note: `${ratio}% of requested` },
                            { label: 'Monthly EMI', value: formatCurrency(emi, currency), note: 'per month' },
                            { label: 'Sanction Ratio', value: `${ratio}%`, note: `of ${formatCurrency(result.loan_amount_requested, currency)}` },
                        ].map(({ label, value, note }, i) => (
                            <div key={label} className={`text-center px-4 ${i < 2 ? 'border-r border-border' : ''}`}>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                                <p className="text-xl font-black text-foreground">{value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* ── REJECTION PATH ─────────────────────────────────────────────────── */}
            {!approved && (
                <>
                    {reasons.length > 0 && (
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert className="h-5 w-5 text-foreground" aria-hidden="true" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                                    Reasons for Rejection
                                </h3>
                            </div>
                            <ul className="space-y-2" role="list">
                                {reasons.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    <ImprovementTips tips={improvementTips} />
                </>
            )}

            {/* ── APPROVAL PATH ──────────────────────────────────────────────────── */}
            {approved && sanctioned > 0 && (
                <>
                    <EmiBreakdown
                        principal={sanctioned}
                        annualRate={interestRate}
                        loanType={loanType}
                        currentTenureYears={selectedTenure}
                        currency={currency}
                    />
                    {suggestedBanks.length > 0 && (
                        <SuggestedBanks banks={suggestedBanks} currency={currency} />
                    )}
                </>
            )}

            {/* ── Financial Health + Credit Profile (always shown) ───────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Card>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">
                        Financial Health
                    </h3>
                    <Row label="Total Monthly Income" value={formatCurrency(parseFormNumber(formData.applicantIncome) + parseFormNumber(formData.coapplicantIncome), currency)} bold />
                    <Row label="Existing EMIs" value={formatCurrency(parseFormNumber(formData.existingEmis), currency)} />
                    <Row label="Projected New EMI" value={formatCurrency(emi, currency)} />
                    <Row label="Free Monthly Income" value={formatCurrency(parseFormNumber(formData.applicantIncome) + parseFormNumber(formData.coapplicantIncome) - parseFormNumber(formData.existingEmis) - (approved ? emi : 0), currency)} bold />
                    <Row label="Debt-to-Income Ratio" value={fh.debt_to_income_ratio} tooltip="Percentage of your gross monthly income that goes toward paying debts." />
                    <Row label="EMI-to-Income (FOIR)" value={fh.emi_to_income_ratio} tooltip="Fixed Obligation to Income Ratio: Measures your ability to service a new loan." />
                </Card>

                <Card>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">
                        Credit Profile
                    </h3>
                    {cp.credit_score > 0 && (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Credit Score</span>
                                <span className="font-bold text-foreground">{cp.credit_score_band}</span>
                            </div>
                            <CreditScoreBar score={cp.credit_score} />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {getCreditScoreLabel(cp.credit_score)}
                            </p>
                        </div>
                    )}
                    <Row label="Credit Score" value={cp.credit_score > 0 ? `${cp.credit_score}` : '—'} />
                    <Row label="Active Loans" value={`${cp.existing_loans} loan${cp.existing_loans !== 1 ? 's' : ''}`} />
                    <Row label="High Risk Flag" value={cp.is_high_risk_flag ? 'Yes' : 'No'} bold isRisk={cp.is_high_risk_flag} tooltip="Flagged if your debt is very high relative to your score." />

                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Loan Metrics</p>
                        <Row label="Amount Requested" value={formatCurrency(result.loan_amount_requested, currency)} />
                        <Row label="Tenure" value={lm.tenure} />
                        <Row label="Loan-to-Income" value={lm.loan_to_income_ratio} tooltip="Ratio of total loan amount to your annual income." />
                        {approved && (
                            <>
                                <Row label="Sanctioned" value={formatCurrency(sanctioned, currency)} bold />
                                <Row label="Monthly EMI" value={formatCurrency(emi, currency)} bold />
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Summary pills — always shown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: Wallet, iconColor: 'text-primary', label: 'Free Income', value: formatCurrency(parseFormNumber(formData.applicantIncome) + parseFormNumber(formData.coapplicantIncome) - parseFormNumber(formData.existingEmis) - (approved ? emi : 0), currency) },
                    { icon: CreditCard, iconColor: 'text-primary', label: 'Credit Score', value: `${cp.credit_score > 0 ? cp.credit_score : '—'} · ${cp.credit_score_band}` },
                    { icon: BadgePercent, iconColor: 'text-primary', label: 'DTI Ratio', value: fh.debt_to_income_ratio },
                    { icon: Clock, label: 'Processing', value: '24 – 48 hrs' },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="border border-border rounded-xl p-4 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onReset}
                    className="border-border text-foreground hover:bg-muted"
                >
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Check Another Loan
                </Button>
                <Button
                    type="button"
                    size="lg"
                    onClick={() => generateLoanReport(result, loanType)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    Download Report
                </Button>
            </div>

        </div>
    )
}
