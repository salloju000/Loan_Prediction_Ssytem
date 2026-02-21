/**
 * components/results/CreditScoreBar.tsx
 *
 * Visual progress bar displaying a credit score in the 300–900 range.
 * Extracted from Results.tsx.
 */

import { memo } from 'react'

export const CreditScoreBar = memo(({ score }: { score: number }) => {
    const pct = Math.max(0, Math.min(100, ((score - 300) / 600) * 100))
    return (
        <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>300</span>
                <span className="font-bold text-foreground">{score}</span>
                <span>900</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-foreground rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                    role="meter"
                    aria-valuenow={score}
                    aria-valuemin={300}
                    aria-valuemax={900}
                    aria-label={`Credit score ${score} out of 900`}
                />
            </div>
        </div>
    )
})
CreditScoreBar.displayName = 'CreditScoreBar'
