/**
 * components/results/SuggestedBanks.tsx
 *
 * List of recommended banks shown when a loan is approved.
 * Extracted from Results.tsx.
 */

import { memo } from 'react'
import { Building2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Bank, CurrencyCode } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="border border-border rounded-xl p-6 bg-card">{children}</div>
)

export const SuggestedBanks = memo(({ banks, currency = 'INR' }: { banks: Bank[]; currency?: CurrencyCode }) => (
    <Card>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-1">
            Recommended Banks
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
            You're approved — here are the best offers for your loan type
        </p>
        <div className="flex flex-col gap-3" role="list">
            {banks.map((bank, i) => (
                <div
                    key={bank.name}
                    role="listitem"
                    className={`border rounded-xl p-4 ${i === 0 ? 'border-foreground' : 'border-border'}`}
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted border border-border">
                                <Building2 className="h-5 w-5 text-foreground" aria-hidden="true" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-foreground">{bank.name}</h4>
                                    {i === 0 && (
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                                            Best Rate
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <Star className="h-3 w-3 fill-foreground text-foreground" aria-hidden="true" />
                                    <span>{bank.rating}</span>
                                    <span>·</span>
                                    <span>Max {formatCurrency(bank.maxAmount, currency)}</span>
                                    <span>·</span>
                                    <span>Fee {bank.processingFee}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-2xl font-black text-foreground">{bank.rate}%</p>
                                <p className="text-xs text-muted-foreground">p.a.</p>
                            </div>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Card>
))
SuggestedBanks.displayName = 'SuggestedBanks'
