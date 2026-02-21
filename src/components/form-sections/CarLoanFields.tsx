/**
 * components/form-sections/CarLoanFields.tsx
 *
 * Loan-type-specific form section for car loans.
 * Shows: Car Type, Car Price, Car Age (for used), Down Payment.
 * Extracted from EnterDetails.tsx.
 */

import { memo } from 'react'
import { AlertCircle, Car } from 'lucide-react'
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

export const CarLoanFields = memo(({
    formData, errors, uid,
    update, inputCls, selectCls, describedBy,
    minDownPayment, maxVehicleAge, currency,
}: FormSectionProps) => {
    const fid = (f: string) => `${uid}-${f}`
    const eid = (f: string) => `${uid}-${f}-error`

    return (
        <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <Car className="h-5 w-5 text-foreground" aria-hidden="true" />
                Vehicle Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                <div>
                    <Label htmlFor={fid('carType')} className="text-sm text-foreground mb-1 block">Car Type *</Label>
                    <Select value={formData.carType || ''} onValueChange={v => update('carType', v)}>
                        <SelectTrigger
                            id={fid('carType')}
                            className={selectCls('carType')}
                            aria-invalid={!!errors.carType}
                            aria-required="true"
                            aria-describedby={describedBy(errors.carType ? eid('carType') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">New Car</SelectItem>
                            <SelectItem value="used">Used Car</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.carType} id={eid('carType')} />
                </div>

                <div>
                    <Label htmlFor={fid('carPrice')} className="text-sm text-foreground mb-1 block">Car Price ({currency}) *</Label>
                    <input
                        id={fid('carPrice')}
                        type="number"
                        inputMode="numeric"
                        placeholder={`e.g., ${formatCurrency(8_00_000, currency)}`}
                        value={formData.carPrice || ''}
                        onChange={e => update('carPrice', e.target.value)}
                        className={inputCls('carPrice')}
                        aria-describedby={describedBy(errors.carPrice ? eid('carPrice') : null)}
                        aria-invalid={!!errors.carPrice}
                        aria-required="true"
                        min={1}
                    />
                    <FieldError msg={errors.carPrice} id={eid('carPrice')} />
                </div>

                {formData.carType === 'used' && (
                    <div>
                        <Label htmlFor={fid('carAge')} className="text-sm text-foreground mb-1 block">Car Age (Years) *</Label>
                        <input
                            id={fid('carAge')}
                            type="number"
                            inputMode="numeric"
                            placeholder="e.g., 3"
                            value={formData.carAge || ''}
                            onChange={e => update('carAge', e.target.value)}
                            className={inputCls('carAge')}
                            aria-describedby={describedBy(errors.carAge ? eid('carAge') : null)}
                            aria-invalid={!!errors.carAge}
                            aria-required="true"
                            min={1}
                            max={maxVehicleAge}
                        />
                        <FieldError msg={errors.carAge} id={eid('carAge')} />
                    </div>
                )}

                <div>
                    <Label htmlFor={fid('downPayment-car')} className="text-sm text-foreground mb-1 block">Down Payment ({currency}) *</Label>
                    <input
                        id={fid('downPayment-car')}
                        type="number"
                        inputMode="numeric"
                        placeholder={minDownPayment ? `Min: ${formatCurrency(minDownPayment, currency)}` : `e.g., ${formatCurrency(2_00_000, currency)}`}
                        value={formData.downPayment || ''}
                        onChange={e => update('downPayment', e.target.value)}
                        className={inputCls('downPayment')}
                        aria-describedby={describedBy(
                            errors.downPayment ? eid('downPayment') : null,
                            minDownPayment ? fid('downPayment-car-hint') : null,
                        )}
                        aria-invalid={!!errors.downPayment}
                        aria-required="true"
                        min={minDownPayment ?? 0}
                    />
                    {minDownPayment && (
                        <p id={fid('downPayment-car-hint')} className="text-xs text-muted-foreground mt-1">
                            Minimum 10%: {formatCurrency(minDownPayment, currency)}
                        </p>
                    )}
                    <FieldError msg={errors.downPayment} id={eid('downPayment')} />
                </div>

            </div>
        </div>
    )
})
CarLoanFields.displayName = 'CarLoanFields'
