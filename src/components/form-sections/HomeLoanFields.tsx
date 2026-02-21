/**
 * components/form-sections/HomeLoanFields.tsx
 *
 * Loan-type-specific form section for home loans.
 * Shows: Property Type, Property Value, Down Payment, LTV Ratio.
 * Extracted from EnterDetails.tsx to reduce its size.
 */

import { memo } from 'react'
import { AlertCircle, Home } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { FormSectionProps } from './FormSectionContext'
import { formatCurrency } from '../../lib/utils'


/** Shared FieldError display */
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

export const HomeLoanFields = memo(({
    formData, errors, uid,
    update, inputCls, selectCls, describedBy,
    minDownPayment, ltvRatio, currency,
}: FormSectionProps) => {
    const fid = (f: string) => `${uid}-${f}`
    const eid = (f: string) => `${uid}-${f}-error`

    return (
        <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <Home className="h-5 w-5 text-foreground" aria-hidden="true" />
                Property Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                <div>
                    <Label htmlFor={fid('propertyType')} className="text-sm text-foreground mb-1 block">Property Type *</Label>
                    <Select value={formData.propertyType || ''} onValueChange={v => update('propertyType', v)}>
                        <SelectTrigger
                            id={fid('propertyType')}
                            className={selectCls('propertyType')}
                            aria-invalid={!!errors.propertyType}
                            aria-required="true"
                            aria-describedby={describedBy(errors.propertyType ? eid('propertyType') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="flat">Flat / Apartment</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="plot">Plot</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.propertyType} id={eid('propertyType')} />
                </div>

                <div>
                    <Label htmlFor={fid('propertyValue')} className="text-sm text-foreground mb-1 block">Property Value ({currency}) *</Label>
                    <input
                        id={fid('propertyValue')}
                        type="number"
                        inputMode="numeric"
                        placeholder={`e.g., ${formatCurrency(50_00_000, currency)}`}
                        value={formData.propertyValue || ''}
                        onChange={e => update('propertyValue', e.target.value)}
                        className={inputCls('propertyValue')}
                        aria-describedby={describedBy(errors.propertyValue ? eid('propertyValue') : null)}
                        aria-invalid={!!errors.propertyValue}
                        aria-required="true"
                        min={1}
                    />
                    <FieldError msg={errors.propertyValue} id={eid('propertyValue')} />
                </div>

                <div>
                    <Label htmlFor={fid('downPayment-home')} className="text-sm text-foreground mb-1 block">Down Payment ({currency}) *</Label>
                    <input
                        id={fid('downPayment-home')}
                        type="number"
                        inputMode="numeric"
                        placeholder={minDownPayment ? `Min: ${formatCurrency(minDownPayment, currency)}` : `e.g., ${formatCurrency(10_00_000, currency)}`}
                        value={formData.downPayment || ''}
                        onChange={e => update('downPayment', e.target.value)}
                        className={inputCls('downPayment')}
                        aria-describedby={describedBy(
                            errors.downPayment ? eid('downPayment') : null,
                            minDownPayment ? fid('downPayment-hint') : null,
                        )}
                        aria-invalid={!!errors.downPayment}
                        aria-required="true"
                        min={minDownPayment ?? 0}
                    />
                    {minDownPayment && (
                        <p id={fid('downPayment-hint')} className="text-xs text-muted-foreground mt-1">
                            Minimum 20%: {formatCurrency(minDownPayment, currency)}
                        </p>
                    )}
                    <FieldError msg={errors.downPayment} id={eid('downPayment')} />
                </div>

                {ltvRatio !== null && (
                    <div className="lg:col-span-3 border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">LTV Ratio</p>
                        <p className="text-xl font-bold text-foreground">{ltvRatio}%</p>
                        {Number(ltvRatio) > 80 && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                                LTV above 80% may require additional documentation
                            </p>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
})
HomeLoanFields.displayName = 'HomeLoanFields'
