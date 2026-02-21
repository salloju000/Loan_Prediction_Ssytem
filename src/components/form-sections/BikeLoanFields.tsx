/**
 * components/form-sections/BikeLoanFields.tsx
 *
 * Loan-type-specific form section for bike loans.
 * Shows: Bike Type, Bike Price, Bike Age (for used), Down Payment.
 * Extracted from EnterDetails.tsx.
 */

import { memo } from 'react'
import { AlertCircle, Bike } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { FormSectionProps } from './FormSectionContext'
import { formatCurrency } from '../../lib/utils'


const FieldError = memo(({ msg, id }: { msg?: string; id?: string }) => {
    if (!msg) return null
    return (
        <p id={id} role="alert" className="flex items-center gap-1 text-xs text-destructive font-medium mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {msg}
        </p>
    )
})
FieldError.displayName = 'FieldError'

export const BikeLoanFields = memo(({
    formData, errors, uid,
    update, inputCls, selectCls, describedBy,
    minDownPayment, maxVehicleAge, currency,
}: FormSectionProps) => {
    const fid = (f: string) => `${uid}-${f}`
    const eid = (f: string) => `${uid}-${f}-error`

    return (
        <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <Bike className="h-5 w-5 text-foreground" aria-hidden="true" />
                Vehicle Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                <div>
                    <Label htmlFor={fid('bikeType')} className="text-sm text-foreground mb-1 block">Bike Type *</Label>
                    <Select value={formData.bikeType || ''} onValueChange={v => update('bikeType', v)}>
                        <SelectTrigger
                            id={fid('bikeType')}
                            className={selectCls('bikeType')}
                            aria-invalid={!!errors.bikeType}
                            aria-required="true"
                            aria-describedby={describedBy(errors.bikeType ? eid('bikeType') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">New Bike</SelectItem>
                            <SelectItem value="used">Used Bike</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.bikeType} id={eid('bikeType')} />
                </div>

                <div>
                    <Label htmlFor={fid('bikePrice')} className="text-sm text-foreground mb-1 block">Bike Price ({currency}) *</Label>
                    <input
                        id={fid('bikePrice')}
                        type="number"
                        inputMode="numeric"
                        placeholder={`e.g., ${formatCurrency(1_50_000, currency)}`}
                        value={formData.bikePrice || ''}
                        onChange={e => update('bikePrice', e.target.value)}
                        className={inputCls('bikePrice')}
                        aria-describedby={describedBy(errors.bikePrice ? eid('bikePrice') : null)}
                        aria-invalid={!!errors.bikePrice}
                        aria-required="true"
                        min={1}
                    />
                    <FieldError msg={errors.bikePrice} id={eid('bikePrice')} />
                </div>

                {formData.bikeType === 'used' && (
                    <div>
                        <Label htmlFor={fid('bikeAge')} className="text-sm text-foreground mb-1 block">Bike Age (Years) *</Label>
                        <input
                            id={fid('bikeAge')}
                            type="number"
                            inputMode="numeric"
                            placeholder="e.g., 2"
                            value={formData.bikeAge || ''}
                            onChange={e => update('bikeAge', e.target.value)}
                            className={inputCls('bikeAge')}
                            aria-describedby={describedBy(errors.bikeAge ? eid('bikeAge') : null)}
                            aria-invalid={!!errors.bikeAge}
                            aria-required="true"
                            min={1}
                            max={maxVehicleAge}
                        />
                        <FieldError msg={errors.bikeAge} id={eid('bikeAge')} />
                    </div>
                )}

                <div>
                    <Label htmlFor={fid('downPayment-bike')} className="text-sm text-foreground mb-1 block">Down Payment ({currency}) *</Label>
                    <input
                        id={fid('downPayment-bike')}
                        type="number"
                        inputMode="numeric"
                        placeholder={minDownPayment ? `Min: ${formatCurrency(minDownPayment, currency)}` : `e.g., ${formatCurrency(30_000, currency)}`}
                        value={formData.downPayment || ''}
                        onChange={e => update('downPayment', e.target.value)}
                        className={inputCls('downPayment')}
                        aria-describedby={describedBy(
                            errors.downPayment ? eid('downPayment') : null,
                            minDownPayment ? fid('downPayment-bike-hint') : null,
                        )}
                        aria-invalid={!!errors.downPayment}
                        aria-required="true"
                        min={minDownPayment ?? 0}
                    />
                    {minDownPayment && (
                        <p id={fid('downPayment-bike-hint')} className="text-xs text-muted-foreground mt-1">
                            Minimum 10%: {formatCurrency(minDownPayment, currency)}
                        </p>
                    )}
                    <FieldError msg={errors.downPayment} id={eid('downPayment')} />
                </div>

            </div>
        </div>
    )
})
BikeLoanFields.displayName = 'BikeLoanFields'
