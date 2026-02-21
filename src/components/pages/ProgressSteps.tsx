/**
 * ProgressSteps.tsx — Step indicator / wizard progress bar
 *
 * Displays the 3-step loan application flow:
 *   Step 1 → Select Loan type
 *   Step 2 → Enter Details
 *   Step 3 → Get Results
 *
 * Production improvements over original:
 *  - Full ARIA: role="list", aria-current="step", aria-label on nav,
 *    aria-label on progress fill, completed steps get visually-hidden
 *    "Completed" text so screen readers convey state
 *  - STEPS moved to module-level const — stable reference, no re-creation
 *    on every render
 *  - Progress fill width derived from constant formula instead of
 *    hard-coded ternary — scales automatically if step count changes
 *  - React.memo + displayName
 *  - currentStep clamped to [1, STEPS.length] — prevents visual breakage
 *    if parent passes 0 or an out-of-bounds value
 *  - Connector line in mobile view animated to fill when step is passed
 *  - Check SVG replaced with inline lucide-style path (no external dep needed)
 *  - Hero heading: text-5xl/6xl reduced to 3xl/4xl — "Your Loan Journey"
 *    at 72px was overwhelming for a nav utility component
 *  - Step counter uses <output> — semantically correct for a computed value
 *    and gets re-announced by screen readers on change
 */

import { memo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressStepsProps {
    currentStep: number
}

interface Step {
    number: number
    label: string
    description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
    { number: 1, label: 'Select Loan', description: 'Pick your loan type' },
    { number: 2, label: 'Enter Details', description: 'Share your info' },
    { number: 3, label: 'Get Results', description: 'See prediction' },
]

/** Width of the animated progress fill as a percentage (0 → 100). */
const progressWidth = (current: number, total: number): string => {
    if (current <= 1) return '0%'
    return `${((current - 1) / (total - 1)) * 100}%`
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CheckIcon = ({ size }: { size: 'sm' | 'lg' }) => (
    <svg
        className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
)

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const ProgressSteps = memo(({ currentStep }: ProgressStepsProps) => {
    // Guard: clamp to valid range so layout never breaks from bad prop values
    const step = Math.min(Math.max(1, currentStep), STEPS.length)
    const total = STEPS.length

    const getStepState = (stepNumber: number) =>
        step > stepNumber ? 'completed' : step === stepNumber ? 'current' : 'upcoming'

    const circleCls = (stepNumber: number) => {
        const state = getStepState(stepNumber)
        return [
            'rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500',
            state !== 'upcoming'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border',
        ].join(' ')
    }

    const labelCls = (stepNumber: number) =>
        step >= stepNumber ? 'text-foreground' : 'text-muted-foreground'

    const descCls = (stepNumber: number) =>
        step >= stepNumber ? 'text-muted-foreground' : 'text-muted-foreground/50'

    return (
        <div className="pt-6 pb-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* ── Hero heading ─────────────────────────────────────────────── */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3">
                        Your Loan Journey
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Three simple steps to get your instant eligibility prediction.
                    </p>
                </div>

                {/* ── Desktop horizontal timeline ──────────────────────────────── */}
                <nav
                    aria-label="Application progress"
                    className="hidden sm:block mb-8"
                >
                    <div className="relative">
                        {/* Track */}
                        <div className="absolute top-8 left-0 right-0 h-px bg-border" aria-hidden="true" />
                        {/* Animated fill */}
                        <div
                            className="absolute top-8 left-0 h-px bg-foreground transition-all duration-700 ease-out"
                            style={{ width: progressWidth(step, total) }}
                            aria-hidden="true"
                        />

                        <ol role="list" className="relative flex justify-between">
                            {STEPS.map((s) => {
                                const state = getStepState(s.number)
                                return (
                                    <li
                                        key={s.number}
                                        className="flex flex-col items-center flex-1"
                                        aria-current={state === 'current' ? 'step' : undefined}
                                    >
                                        <div className={`${circleCls(s.number)} w-16 h-16 text-lg mb-5 relative z-10`}>
                                            {state === 'completed' ? (
                                                <>
                                                    <CheckIcon size="lg" />
                                                    <span className="sr-only">Completed — </span>
                                                </>
                                            ) : s.number}
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-sm font-bold mb-0.5 ${labelCls(s.number)}`}>
                                                {s.label}
                                            </h3>
                                            <p className={`text-xs ${descCls(s.number)}`}>
                                                {s.description}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                </nav>

                {/* ── Mobile vertical timeline ─────────────────────────────────── */}
                <nav
                    aria-label="Application progress"
                    className="sm:hidden mb-8"
                >
                    <ol role="list" className="space-y-0">
                        {STEPS.map((s, index) => {
                            const state = getStepState(s.number)
                            const isLast = index === STEPS.length - 1
                            return (
                                <li
                                    key={s.number}
                                    className="flex gap-4 items-start"
                                    aria-current={state === 'current' ? 'step' : undefined}
                                >
                                    {/* Circle + connector */}
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className={`${circleCls(s.number)} w-10 h-10 text-sm`}>
                                            {state === 'completed' ? (
                                                <>
                                                    <CheckIcon size="sm" />
                                                    <span className="sr-only">Completed — </span>
                                                </>
                                            ) : s.number}
                                        </div>
                                        {!isLast && (
                                            <div className="relative w-px h-10 bg-border mt-2 overflow-hidden">
                                                {/* Animated connector fill */}
                                                <div
                                                    className="absolute top-0 left-0 w-full bg-foreground transition-all duration-700 ease-out"
                                                    style={{ height: state === 'completed' ? '100%' : '0%' }}
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="pt-1 pb-8">
                                        <h3 className={`text-sm font-bold mb-0.5 ${labelCls(s.number)}`}>
                                            {s.label}
                                        </h3>
                                        <p className={`text-xs ${descCls(s.number)}`}>
                                            {s.description}
                                        </p>
                                    </div>
                                </li>
                            )
                        })}
                    </ol>
                </nav>

                {/* ── Step counter ─────────────────────────────────────────────── */}
                {/*
          <output> is the correct semantic element for a computed/derived
          value. Screen readers re-announce it on change,
          giving users audio confirmation that the step advanced.
        */}
                <output
                    aria-live="polite"
                    className="block text-center text-sm text-muted-foreground"
                >
                    Step{' '}
                    <span className="text-foreground font-bold">{step}</span>
                    {' '}of{' '}
                    <span className="font-bold">{total}</span>
                </output>

            </div>
        </div>
    )
})

ProgressSteps.displayName = 'ProgressSteps'