/**
 * HomeSpecificFields.tsx — Home loan sub-form fields.
 *
 * Production improvements over original:
 *  - `any` removed from onFieldChange → typed as (field: keyof FormData, value: string)
 *  - Error colour fixed: `text-foreground` → `text-destructive`
 *  - Error border fixed: `border-foreground` → `border-destructive`
 *  - aria-invalid + aria-describedby wired on all fields
 *  - htmlFor on Labels now match SelectTrigger id (was pointing at non-existent ids)
 *  - useId() for collision-free, concurrent-mode-safe field IDs
 *  - FieldError sub-component with role="alert" + AlertCircle icon (replaces ⚠ emoji)
 *  - Live LTV ratio display — was only a static hint, now shows real computed value
 *    with colour-coded warning when LTV > 80% (matching EnterDetails behaviour)
 *  - Minimum 20% down payment hint shown dynamically once propertyValue is entered
 *  - propertyValue and downPayment have min={1} / min={0} to block negative input
 *  - inputMode="numeric" for correct mobile keyboards
 *  - 💡 emoji → Info icon (consistent cross-OS rendering, matches lucide-react set)
 *  - Decorative `div` bar → Home icon for semantic section header
 *  - React.memo + displayName to prevent unnecessary re-renders
 */

import { memo, useId, useMemo } from 'react'
import { AlertCircle, Home, Info } from 'lucide-react'
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

interface HomeFieldsProps {
    formData: FormData
    errors: FormErrors
    /** Strongly-typed — no `any`. */
    onFieldChange: (field: keyof FormData, value: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MIN_DOWN_PAYMENT_RATIO = 0.20   // 20% of property value
const LTV_WARNING_THRESHOLD = 80     // % — above this, extra docs likely required

const inrFormat = (n: number) => n.toLocaleString('en-IN')

/** Safe numeric conversion — returns 0 for NaN / empty. */
const toNum = (v: string | number | undefined): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface FieldErrorProps {
    msg?: string
    id: string
}

const FieldError = memo(({ msg, id }: FieldErrorProps) => {
    if (!msg) return null
    return (
        <p id={id} role="alert" className="flex items-center gap-1 text-xs text-destructive font-medium mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {msg}
        </p>
    )
})
FieldError.displayName = 'FieldError'

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const HomeSpecificFields = memo(({
    formData,
    errors,
    onFieldChange,
}: HomeFieldsProps) => {
    const uid = useId()
    const fid = (field: string) => `${uid}-${field}`
    const eid = (field: string) => `${uid}-${field}-error`

    // Shared class builders
    const triggerCls = (field: keyof FormErrors) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field] ? 'border-destructive border-2' : '',
        ].filter(Boolean).join(' ')

    const inputCls = (field: keyof FormErrors) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field] ? 'border-destructive border-2' : '',
        ].filter(Boolean).join(' ')

    // ── Derived display values ───────────────────────────────────────────────
    const propVal = toNum(formData.propertyValue)
    const loanAmt = toNum(formData.loanAmount)   // parent form field, may be present

    const minDownPayment = useMemo<number | null>(() => {
        if (!propVal) return null
        return Math.ceil(propVal * MIN_DOWN_PAYMENT_RATIO)
    }, [propVal])

    /** LTV = loan / propertyValue × 100. Only shown when both values are present. */
    const ltvRatio = useMemo<string | null>(() => {
        if (!loanAmt || !propVal) return null
        return ((loanAmt / propVal) * 100).toFixed(1)
    }, [loanAmt, propVal])

    const ltvNum = ltvRatio !== null ? Number(ltvRatio) : null

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                <Home className="h-4 w-4" aria-hidden="true" />
                Property Details
            </h4>

            {/* ── Property Type ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('propertyType')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Property Type
                </Label>
                <Select
                    value={formData.propertyType}
                    onValueChange={value => onFieldChange('propertyType', value)}
                >
                    <SelectTrigger
                        id={fid('propertyType')}
                        className={triggerCls('propertyType')}
                        aria-invalid={!!errors.propertyType}
                        aria-describedby={errors.propertyType ? eid('propertyType') : undefined}
                    >
                        <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="flat">Flat / Apartment</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="plot">Plot</SelectItem>
                        <SelectItem value="commercial">Commercial Property</SelectItem>
                    </SelectContent>
                </Select>
                <FieldError msg={errors.propertyType} id={eid('propertyType')} />
            </div>

            {/* ── Property Value ────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('propertyValue')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Property Value (₹)
                </Label>
                <Input
                    id={fid('propertyValue')}
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter property value"
                    value={formData.propertyValue}
                    onChange={e => onFieldChange('propertyValue', e.target.value)}
                    className={inputCls('propertyValue')}
                    aria-invalid={!!errors.propertyValue}
                    aria-describedby={errors.propertyValue ? eid('propertyValue') : undefined}
                    min={1}
                />
                <FieldError msg={errors.propertyValue} id={eid('propertyValue')} />
            </div>

            {/* ── Down Payment ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('downPayment')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Down Payment (₹)
                </Label>
                <Input
                    id={fid('downPayment')}
                    type="number"
                    inputMode="numeric"
                    placeholder={minDownPayment ? `Min: ₹${inrFormat(minDownPayment)}` : 'Enter down payment amount'}
                    value={formData.downPayment}
                    onChange={e => onFieldChange('downPayment', e.target.value)}
                    className={inputCls('downPayment')}
                    aria-invalid={!!errors.downPayment}
                    aria-describedby={[
                        errors.downPayment ? eid('downPayment') : '',
                        minDownPayment ? fid('downPayment-hint') : '',
                    ].filter(Boolean).join(' ') || undefined}
                    min={0}
                />
                {minDownPayment && (
                    <p id={fid('downPayment-hint')} className="text-xs text-muted-foreground">
                        Minimum 20%: ₹{inrFormat(minDownPayment)}
                    </p>
                )}
                <FieldError msg={errors.downPayment} id={eid('downPayment')} />
            </div>

            {/* ── Live LTV Display ──────────────────────────────────────────────── */}
            {ltvRatio !== null ? (
                <div className="border border-border rounded-lg p-3 bg-muted space-y-1">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            LTV Ratio
                        </p>
                        <p className={`text-sm font-bold ${ltvNum !== null && ltvNum > LTV_WARNING_THRESHOLD ? 'text-destructive' : 'text-foreground'}`}>
                            {ltvRatio}%
                        </p>
                    </div>
                    {ltvNum !== null && ltvNum > LTV_WARNING_THRESHOLD && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            LTV above {LTV_WARNING_THRESHOLD}% may require additional documentation
                        </p>
                    )}
                </div>
            ) : (
                /* Static hint shown before values are entered */
                <div className="bg-muted border border-border rounded-lg p-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                        <strong className="text-foreground">LTV Ratio:</strong>{' '}
                        Enter loan amount and property value to see your Loan-to-Value ratio.
                    </p>
                </div>
            )}
        </div>
    )
})

HomeSpecificFields.displayName = 'HomeSpecificFields'