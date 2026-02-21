/**
 * components/results/EmiBreakdown.tsx
 *
 * EMI tenure breakdown table showing monthly EMI, total payment,
 * total interest, and interest % across multiple tenure options.
 * Extracted from Results.tsx.
 */

import { memo, useMemo } from 'react'
import { Calendar, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { CurrencyCode } from '../../lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmiRow {
    tenureYears: number
    tenureMonths: number
    monthlyEmi: number
    totalPayment: number
    totalInterest: number
    interestPct: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_TENURE_BY_LOAN: Record<string, number> = {
    car: 7,
    home: 30,
    bike: 5,
    education: 15,
    personal: 7,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Standard reducing-balance EMI formula.
 * EMI = P × r(1+r)^n / ((1+r)^n − 1)
 */
export const calcEmi = (principal: number, annualRate: number, months: number): number => {
    if (!principal || !annualRate || !months) return 0
    const r = annualRate / 100 / 12
    const pow = Math.pow(1 + r, months)
    return (principal * r * pow) / (pow - 1)
}

export const buildEmiTable = (
    principal: number,
    annualRate: number,
    maxTenureYears: number,
    currentTenureYears: number,
): EmiRow[] => {
    if (!principal || !annualRate) return []

    const tenures = new Set<number>()
    for (let y = 1; y <= Math.min(5, maxTenureYears); y++) tenures.add(y)
    for (let y = 10; y <= maxTenureYears; y += 5) tenures.add(y)
    if (maxTenureYears > 5) tenures.add(maxTenureYears)
    if (currentTenureYears >= 1 && currentTenureYears <= maxTenureYears) {
        tenures.add(currentTenureYears)
    }

    return [...tenures].sort((a, b) => a - b).map(years => {
        const months = years * 12
        const monthlyEmi = calcEmi(principal, annualRate, months)
        const totalPayment = monthlyEmi * months
        const totalInterest = totalPayment - principal
        const interestPct = (totalInterest / principal) * 100
        return { tenureYears: years, tenureMonths: months, monthlyEmi, totalPayment, totalInterest, interestPct }
    })
}

// ── Shared Card wrapper (local, not exported — keeps sub-components self-contained) ──

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`border border-border rounded-xl p-6 bg-card ${className}`}>{children}</div>
)

// ── Component ─────────────────────────────────────────────────────────────────

export const EmiBreakdown = memo(({
    principal, annualRate, loanType, currentTenureYears, currency = 'INR',
}: {
    principal: number
    annualRate: number
    loanType: string
    currentTenureYears: number
    currency?: CurrencyCode
}) => {
    const maxTenure = MAX_TENURE_BY_LOAN[loanType] ?? 7
    const rows = useMemo(
        () => buildEmiTable(principal, annualRate, maxTenure, currentTenureYears),
        [principal, annualRate, maxTenure, currentTenureYears],
    )
    if (!rows.length) return null

    return (
        <Card>
            <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-foreground" aria-hidden="true" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                    EMI Tenure Breakdown
                </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
                Monthly EMI and total cost across different tenures at{' '}
                <strong className="text-foreground">{annualRate}% p.a.</strong> on{' '}
                <strong className="text-foreground">{formatCurrency(principal, currency)}</strong>
            </p>

            <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm" role="table" aria-label="EMI breakdown by tenure">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tenure', 'Monthly EMI', 'Total Payment', 'Total Interest', 'Interest %'].map(h => (
                                <th
                                    key={h}
                                    scope="col"
                                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 px-2 text-right first:text-left"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const isSelected = row.tenureYears === currentTenureYears
                            return (
                                <tr
                                    key={row.tenureYears}
                                    className={`border-b border-border last:border-0 transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-muted/40'}`}
                                    aria-selected={isSelected}
                                >
                                    <td className="py-3 px-2 font-medium text-foreground">
                                        <span className="flex items-center gap-2">
                                            {row.tenureYears} yr{row.tenureYears !== 1 ? 's' : ''}
                                            {isSelected && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary text-primary-foreground rounded-sm leading-none">
                                                    Selected
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right font-bold text-foreground">
                                        {formatCurrency(Math.round(row.monthlyEmi), currency)}
                                    </td>
                                    <td className="py-3 px-2 text-right text-foreground">
                                        {formatCurrency(Math.round(row.totalPayment), currency)}
                                    </td>
                                    <td className="py-3 px-2 text-right text-muted-foreground">
                                        {formatCurrency(Math.round(row.totalInterest), currency)}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <span className={`text-xs font-semibold ${row.interestPct > 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            {row.interestPct.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                    Shorter tenures mean higher monthly EMI but less total interest paid.
                    The highlighted row is your selected tenure.
                </span>
            </div>
        </Card>
    )
})
EmiBreakdown.displayName = 'EmiBreakdown'
