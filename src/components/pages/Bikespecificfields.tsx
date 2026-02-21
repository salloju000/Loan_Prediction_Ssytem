/**
 * BikeSpecificFields.tsx — Bike loan sub-form fields.
 *
 * Production improvements over original:
 *  - `any` removed from onFieldChange signature → typed overloads
 *  - Proper `aria-*` attributes on all inputs and selects
 *  - `aria-describedby` only emitted when an error actually exists
 *  - Error paragraphs use role="alert" and semantic destructive colour
 *    (not `text-foreground` which is invisible against most backgrounds)
 *  - bikeAge field: `max` reduced from 30 → 20 to match EnterDetails contract;
 *    error display and aria wired up (was missing entirely in original)
 *  - htmlFor on bikeType Label now matches SelectTrigger id
 *  - All inputs have explicit `min` to prevent negative values
 *  - Component wrapped in React.memo — parent re-renders don't cascade here
 *    unless formData / errors / onFieldChange references actually change
 *  - AlertCircle icon replaces ⚠ emoji for consistent visual language
 */

import { memo, useId } from 'react'
import { AlertCircle, Bike } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { FormData, FormErrors } from '../../lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface BikeFieldsProps {
    formData: FormData
    errors: FormErrors
    /** Strongly-typed field change handler — no `any`. */
    onFieldChange: (field: keyof FormData, value: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BIKE_AGE = 20   // years — matches EnterDetails validation contract

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface FieldErrorProps {
    msg?: string
    id: string
}

/** Consistent inline error with role="alert" and destructive colour. */
const FieldError = ({ msg, id }: FieldErrorProps) => {
    if (!msg) return null
    return (
        <p id={id} role="alert" className="flex items-center gap-1 text-xs text-destructive font-medium mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {msg}
        </p>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const BikeSpecificFields = memo(({ formData, errors, onFieldChange }: BikeFieldsProps) => {
    // Stable, unique IDs for aria-describedby linkage (safe for concurrent mode)
    const uid = useId()
    const eid = (field: string) => `${uid}-${field}-error`

    // Shared trigger class builder — keeps JSX lean
    const triggerCls = (field: string) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field as keyof FormErrors] ? 'border-destructive border-2' : '',
        ]
            .filter(Boolean)
            .join(' ')

    const inputCls = (field: string) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field as keyof FormErrors] ? 'border-destructive border-2' : '',
        ]
            .filter(Boolean)
            .join(' ')

    return (
        <div className="space-y-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                <Bike className="h-4 w-4" aria-hidden="true" />
                Vehicle Details
            </h4>

            {/* ── Bike Type ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={`${uid}-bikeType`}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Bike Type
                </Label>
                <Select
                    value={formData.bikeType}
                    onValueChange={value => onFieldChange('bikeType', value)}
                >
                    <SelectTrigger
                        id={`${uid}-bikeType`}
                        className={triggerCls('bikeType')}
                        aria-invalid={!!errors.bikeType}
                        aria-describedby={errors.bikeType ? eid('bikeType') : undefined}
                    >
                        <SelectValue placeholder="Select bike type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="new">New Bike</SelectItem>
                        <SelectItem value="used">Used Bike</SelectItem>
                    </SelectContent>
                </Select>
                <FieldError msg={errors.bikeType} id={eid('bikeType')} />
            </div>

            {/* ── Bike Price ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={`${uid}-bikePrice`}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Bike Price (₹)
                </Label>
                <Input
                    id={`${uid}-bikePrice`}
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter bike price"
                    value={formData.bikePrice}
                    onChange={e => onFieldChange('bikePrice', e.target.value)}
                    className={inputCls('bikePrice')}
                    aria-invalid={!!errors.bikePrice}
                    aria-describedby={errors.bikePrice ? eid('bikePrice') : undefined}
                    min={1}
                />
                <FieldError msg={errors.bikePrice} id={eid('bikePrice')} />
            </div>

            {/* ── Bike Age (used only) ────────────────────────────────────────── */}
            {formData.bikeType === 'used' && (
                <div className="space-y-2">
                    <Label
                        htmlFor={`${uid}-bikeAge`}
                        className="text-xs text-muted-foreground uppercase tracking-wide"
                    >
                        Bike Age (Years)
                    </Label>
                    <Input
                        id={`${uid}-bikeAge`}
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter bike age"
                        value={formData.bikeAge}
                        onChange={e => onFieldChange('bikeAge', e.target.value)}
                        className={inputCls('bikeAge')}
                        aria-invalid={!!errors.bikeAge}
                        aria-describedby={errors.bikeAge ? eid('bikeAge') : undefined}
                        min={1}
                        max={MAX_BIKE_AGE}
                    />
                    <FieldError msg={errors.bikeAge} id={eid('bikeAge')} />
                </div>
            )}

            {/* ── Down Payment ───────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={`${uid}-downPayment`}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Down Payment (₹)
                </Label>
                <Input
                    id={`${uid}-downPayment`}
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter down payment amount"
                    value={formData.downPayment}
                    onChange={e => onFieldChange('downPayment', e.target.value)}
                    className={inputCls('downPayment')}
                    aria-invalid={!!errors.downPayment}
                    aria-describedby={errors.downPayment ? eid('downPayment') : undefined}
                    min={0}
                />
                <FieldError msg={errors.downPayment} id={eid('downPayment')} />
            </div>
        </div>
    )
})

BikeSpecificFields.displayName = 'BikeSpecificFields'