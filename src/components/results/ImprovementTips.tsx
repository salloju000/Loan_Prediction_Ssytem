/**
 * components/results/ImprovementTips.tsx
 *
 * Actionable improvement tips shown when a loan application is rejected.
 * Derives tips from rejection reason strings using keyword matching so it
 * stays decoupled from exact backend message wording.
 * Extracted from Results.tsx.
 */

import { memo } from 'react'
import {
    BarChart3, Clock, CreditCard,
    Info, Lightbulb, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import type { LoanPredictResponse } from '../../lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single improvement tip derived from rejection reasons */
export interface ImprovementTip {
    icon: React.ReactNode
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PRIORITY_STYLES: Record<ImprovementTip['priority'], string> = {
    high: 'border-l-destructive bg-destructive/5',
    medium: 'border-l-amber-500 bg-amber-500/5',
    low: 'border-l-border bg-muted/40',
}

const PRIORITY_LABELS: Record<ImprovementTip['priority'], string> = {
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Good to know',
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Derive actionable improvement tips from rejection reason strings.
 * Matches on keywords in the reason text — keeps it decoupled from
 * backend message wording changes.
 */
export const buildImprovementTips = (
    reasons: string[],
    breakdown: LoanPredictResponse['breakdown'],
): ImprovementTip[] => {
    const tips: ImprovementTip[] = []
    const text = reasons.join(' ').toLowerCase()

    if (text.includes('credit score')) {
        const score = breakdown.credit_profile.credit_score
        const needed = score < 600 ? 650 - score : 700 - score
        tips.push({
            icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
            title: 'Improve your credit score',
            description: `Your score is ${score}. Paying all EMIs and credit card bills on time for 6–12 months can add ${needed}+ points. Avoid applying for new credit during this period.`,
            priority: 'high',
        })
    }

    if (text.includes('debt-to-income') || text.includes('dti')) {
        tips.push({
            icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
            title: 'Reduce your debt-to-income ratio',
            description: `Close or prepay existing loans before re-applying. Alternatively, increasing your income through a raise or adding a co-applicant with steady income can bring your DTI below the 50% threshold.`,
            priority: 'high',
        })
    }

    if (text.includes('free monthly income') || text.includes('insufficient')) {
        tips.push({
            icon: <Wallet className="h-4 w-4" aria-hidden="true" />,
            title: 'Increase free monthly income',
            description: `After all EMIs you have little or no surplus. Try clearing smaller existing loans first, or add a co-applicant income. Extending the tenure reduces the projected EMI and increases your free income.`,
            priority: 'high',
        })
    }

    if (text.includes('existing loan') || text.includes('active loan')) {
        tips.push({
            icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
            title: 'Close some existing loans',
            description: `You have ${breakdown.credit_profile.existing_loans} active loan(s). Banks prefer applicants with fewer than 3. Closing even one loan reduces your DTI and improves your approval chances significantly.`,
            priority: 'medium',
        })
    }

    if (text.includes('loan amount') || text.includes('income ratio')) {
        tips.push({
            icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
            title: 'Apply for a lower loan amount',
            description: `The requested amount is high relative to your income. Try reducing the loan amount by 20–30%, or extend the tenure to lower the EMI burden. A smaller sanctioned amount is better than a rejection.`,
            priority: 'medium',
        })
    }

    if (tips.length === 0) {
        tips.push({
            icon: <Info className="h-4 w-4" aria-hidden="true" />,
            title: 'Address multiple risk factors',
            description: `Your application was borderline across several dimensions. Focus on improving your credit score above 700, keeping your DTI below 40%, and maintaining a clean repayment history for 6 months before re-applying.`,
            priority: 'medium',
        })
    }

    tips.push({
        icon: <Clock className="h-4 w-4" aria-hidden="true" />,
        title: 'Wait before re-applying',
        description: `Multiple loan applications in a short period lower your credit score due to hard inquiries. Wait at least 3–6 months after making the improvements above before submitting a new application.`,
        priority: 'low',
    })

    return tips
}

// ── Shared Card wrapper ───────────────────────────────────────────────────────

const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="border border-border rounded-xl p-6 bg-card">{children}</div>
)

// ── Component ─────────────────────────────────────────────────────────────────

export const ImprovementTips = memo(({ tips }: { tips: ImprovementTip[] }) => (
    <Card>
        <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-foreground" aria-hidden="true" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                How to Improve Your Chances
            </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
            Address these areas and re-apply. Items marked <strong>High priority</strong> have the most impact.
        </p>
        <ul className="flex flex-col gap-3" role="list">
            {tips.map((tip, i) => (
                <li
                    key={i}
                    className={`border-l-4 rounded-r-lg px-4 py-3 ${PRIORITY_STYLES[tip.priority]}`}
                    role="listitem"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-foreground">{tip.icon}</span>
                        <span className="text-sm font-semibold text-foreground">{tip.title}</span>
                        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${tip.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                            tip.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                                'bg-muted text-muted-foreground'
                            }`}>
                            {PRIORITY_LABELS[tip.priority]}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                </li>
            ))}
        </ul>
    </Card>
))
ImprovementTips.displayName = 'ImprovementTips'
