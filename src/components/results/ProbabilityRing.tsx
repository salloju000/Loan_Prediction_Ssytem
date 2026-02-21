/**
 * components/results/ProbabilityRing.tsx
 *
 * Animated SVG ring showing approval probability percentage.
 * Animates 0 → final value on mount for a smooth entrance effect.
 * Extracted from Results.tsx.
 */

import { memo, useState, useEffect } from 'react'

export const ProbabilityRing = memo(({ probability, approved }: { probability: number; approved: boolean }) => {
    const r = 42
    const circ = 2 * Math.PI * r
    const pct = Math.max(0, Math.min(100, probability))

    const [displayPct, setDisplayPct] = useState(0)
    useEffect(() => {
        const raf = requestAnimationFrame(() => setDisplayPct(pct))
        return () => cancelAnimationFrame(raf)
    }, [pct])

    const offset = circ - (displayPct / 100) * circ

    return (
        <div
            className="relative inline-flex items-center justify-center"
            role="img"
            aria-label={`Approval confidence ${pct.toFixed(0)}%`}
        >
            <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <circle
                    cx="55" cy="55" r={r}
                    fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={approved ? 'text-foreground' : 'text-muted-foreground'}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-xl font-black text-foreground leading-none">{pct.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Score</p>
            </div>
        </div>
    )
})
ProbabilityRing.displayName = 'ProbabilityRing'
