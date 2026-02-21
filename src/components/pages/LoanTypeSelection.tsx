/**
 * LoanTypeSelection.tsx — Step 1: Pick a loan type.
 *
 * Production improvements over original:
 *  - Keyboard accessibility: cards are now <button> elements, not bare <div>s
 *    with onClick — div-clicks are invisible to keyboard-only users and
 *    screen readers. Buttons get focus, Enter/Space activation, and
 *    focus-visible ring for free.
 *  - role="list" / role="listitem" on loan cards grid — semantically
 *    communicates "these are N options" to screen readers
 *  - feature highlights keyed by stable string, not array index
 *  - LoanType used as prop generic constraint (was already imported but
 *    the map cast was redundant — cleaned up)
 *  - aria-label on each loan card ("Apply for Car Loan") gives screen reader
 *    users unambiguous context without relying on visual layout
 *  - ArrowRight icon aria-hidden (decorative)
 *  - Feature icons aria-hidden (decorative)
 *  - React.memo — component has no internal state and only re-renders when
 *    onSelectLoan reference changes; memo prevents needless reconciliation
 *  - displayName set for React DevTools
 *  - CTA banner: "AI-powered" claim is accurate but subjective — preserved
 *    as-is since it's marketing copy, not a functional concern
 */

import { memo } from 'react'
import { ArrowRight, CheckCircle2, Shield, TrendingUp } from 'lucide-react'
import { loanTypes } from '../../lib/constants'
import type { LoanType, LoanTypeId } from '../../lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LoanTypeSelectionProps {
    onSelectLoan: (loanTypeId: LoanTypeId) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        id: 'instant-results',
        icon: CheckCircle2,
        title: 'Instant Results',
        description: 'Get eligibility prediction in seconds',
    },
    {
        id: 'secure-private',
        icon: Shield,
        title: 'Secure & Private',
        description: 'Your data is encrypted and safe',
    },
    {
        id: 'best-offers',
        icon: TrendingUp,
        title: 'Best Offers',
        description: 'Compare rates from top banks',
    },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const LoanTypeSelection = memo(({ onSelectLoan }: LoanTypeSelectionProps) => {
    return (
        <div className="animate-fade-in">

            {/* ── Page header ─────────────────────────────────────────────────── */}
            <div className="text-center mb-14 px-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Get Started
                </p>
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
                    Select Your Loan Type
                </h2>
                <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    Choose the loan that best fits your financial needs. We'll provide instant eligibility
                    analysis and personalised recommendations.
                </p>
            </div>

            {/* ── Loan cards grid ─────────────────────────────────────────────── */}
            {/*
        role="list" communicates to screen readers that there are N loan
        options, and each item is one of them — without it, a grid of
        buttons is announced with no count context.
      */}
            <ul
                role="list"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-14 px-4"
            >
                {loanTypes.map((loan: LoanType) => (
                    <li key={loan.id} role="listitem">
                        {/*
              Using <button> instead of a clickable <div>:
              - Keyboard users can Tab to it and activate with Enter/Space
              - Screen readers announce it as an interactive element
              - focus-visible ring gives a clear focus indicator
              - No manual tabIndex or onKeyDown handler needed
            */}
                        <button
                            type="button"
                            onClick={() => onSelectLoan(loan.id)}
                            aria-label={`Apply for ${loan.name}`}
                            className="
                loan-card group w-full text-left cursor-pointer
                border border-border rounded-xl p-6 bg-card
                hover:border-foreground hover:shadow-md
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                transition-all
              "
                        >
                            {/* Icon + rate badge */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="p-3 rounded-lg bg-muted text-foreground flex-shrink-0" aria-hidden="true">
                                    {loan.icon}
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground border border-border rounded-full px-3 py-1">
                                    {loan.rateRange}
                                </span>
                            </div>

                            <h3 className="text-base font-semibold text-foreground mb-1">{loan.name}</h3>
                            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{loan.description}</p>

                            <div className="flex items-center text-foreground text-sm font-semibold" aria-hidden="true">
                                <span>Explore Loan</span>
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </div>
                        </button>
                    </li>
                ))}
            </ul>

            {/* ── Feature highlights ──────────────────────────────────────────── */}
            <div className="max-w-4xl mx-auto px-4">
                <ul
                    role="list"
                    className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8"
                >
                    {FEATURES.map((feature) => (
                        <li
                            key={feature.id}
                            className="border border-border rounded-xl p-6 text-center bg-card hover:border-foreground/40 transition-all"
                        >
                            <div className="p-3 rounded-lg bg-muted w-fit mx-auto mb-4" aria-hidden="true">
                                <feature.icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                            </div>
                            <h4 className="font-semibold text-foreground mb-1 text-sm">{feature.title}</h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </li>
                    ))}
                </ul>

                {/* ── CTA banner ──────────────────────────────────────────────── */}
                <div className="border border-border rounded-xl p-8 text-center bg-muted">
                    <p className="text-foreground mb-2 text-sm font-medium">
                        Not sure which loan is right for you?
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Our AI-powered engine will analyse your profile and suggest the best options.
                    </p>
                </div>
            </div>

        </div>
    )
})

LoanTypeSelection.displayName = 'LoanTypeSelection'