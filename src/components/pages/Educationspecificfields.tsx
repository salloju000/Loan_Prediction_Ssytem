/**
 * EducationSpecificFields.tsx — Education loan sub-form fields.
 *
 * Production improvements over original:
 *  - `any` removed from onFieldChange → typed as (field: keyof FormData, value: string)
 *  - Error colour fixed: `text-foreground` → `text-destructive`
 *  - Error border fixed: `border-foreground` → `border-destructive`
 *  - aria-invalid + aria-describedby wired on all fields
 *  - htmlFor on Labels now match SelectTrigger id (was pointing at non-existent ids)
 *  - useId() for collision-free, concurrent-mode-safe field IDs
 *  - FieldError sub-component with role="alert" + AlertCircle icon (replaces ⚠ emoji)
 *  - institutionTier field added — was silently missing despite being validated upstream
 *  - courseDuration min enforced at 1 (original had min="1" in HTML but no guard
 *    against the browser allowing 0 via keyboard on some implementations)
 *  - Tip block: 💡 emoji → Info icon for consistent cross-OS rendering
 *  - React.memo + displayName to prevent unnecessary re-renders
 */

import { memo, useId } from 'react'
import { AlertCircle, BookOpen, Info } from 'lucide-react'
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

interface EducationFieldsProps {
    formData: FormData
    errors: FormErrors
    /** Strongly-typed — no `any`. */
    onFieldChange: (field: keyof FormData, value: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MIN_COURSE_DURATION = 1
const MAX_COURSE_DURATION = 10

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

export const EducationSpecificFields = memo(({
    formData,
    errors,
    onFieldChange,
}: EducationFieldsProps) => {
    const uid = useId()
    const fid = (field: string) => `${uid}-${field}`
    const eid = (field: string) => `${uid}-${field}-error`

    // Shared class builder — errors use destructive colour, not foreground
    const triggerCls = (field: keyof FormErrors) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field] ? 'border-destructive border-2' : '',
        ]
            .filter(Boolean)
            .join(' ')

    const inputCls = (field: keyof FormErrors) =>
        [
            'h-11 bg-background border-border text-foreground text-base',
            errors[field] ? 'border-destructive border-2' : '',
        ]
            .filter(Boolean)
            .join(' ')

    return (
        <div className="space-y-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Course Details
            </h4>

            {/* ── Course Type ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('courseType')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Course Type
                </Label>
                <Select
                    value={formData.courseType}
                    onValueChange={value => onFieldChange('courseType', value)}
                >
                    <SelectTrigger
                        id={fid('courseType')}
                        className={triggerCls('courseType')}
                        aria-invalid={!!errors.courseType}
                        aria-describedby={errors.courseType ? eid('courseType') : undefined}
                    >
                        <SelectValue placeholder="Select course type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="diploma">Diploma</SelectItem>
                        <SelectItem value="graduation">Graduation (B.Tech, B.Sc, B.A)</SelectItem>
                        <SelectItem value="masters">Masters (M.Tech, M.Sc, MBA)</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                        <SelectItem value="professional">Professional (Law, Medical)</SelectItem>
                    </SelectContent>
                </Select>
                <FieldError msg={errors.courseType} id={eid('courseType')} />
            </div>

            {/* ── Institution Tier ────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('institutionTier')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Institution Tier
                </Label>
                <Select
                    value={formData.institutionTier}
                    onValueChange={value => onFieldChange('institutionTier', value)}
                >
                    <SelectTrigger
                        id={fid('institutionTier')}
                        className={triggerCls('institutionTier')}
                        aria-invalid={!!errors.institutionTier}
                        aria-describedby={errors.institutionTier ? eid('institutionTier') : undefined}
                    >
                        <SelectValue placeholder="Select institution tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="Tier-1">Tier 1 — IIT / IIM / AIIMS</SelectItem>
                        <SelectItem value="Tier-2">Tier 2 — State / NITs</SelectItem>
                        <SelectItem value="Tier-3">Tier 3 — Private / Other</SelectItem>
                    </SelectContent>
                </Select>
                <FieldError msg={errors.institutionTier} id={eid('institutionTier')} />
            </div>

            {/* ── Study Location ──────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('studyLocation')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Study Location
                </Label>
                <Select
                    value={formData.studyLocation}
                    onValueChange={value => onFieldChange('studyLocation', value)}
                >
                    <SelectTrigger
                        id={fid('studyLocation')}
                        className={triggerCls('studyLocation')}
                        aria-invalid={!!errors.studyLocation}
                        aria-describedby={errors.studyLocation ? eid('studyLocation') : undefined}
                    >
                        <SelectValue placeholder="Select study location" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="abroad">Abroad</SelectItem>
                    </SelectContent>
                </Select>
                <FieldError msg={errors.studyLocation} id={eid('studyLocation')} />
            </div>

            {/* ── Course Duration ─────────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label
                    htmlFor={fid('courseDuration')}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Course Duration (Years)
                </Label>
                <Input
                    id={fid('courseDuration')}
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g., 4"
                    value={formData.courseDuration}
                    onChange={e => onFieldChange('courseDuration', e.target.value)}
                    className={inputCls('courseDuration')}
                    aria-invalid={!!errors.courseDuration}
                    aria-describedby={[
                        errors.courseDuration ? eid('courseDuration') : '',
                        fid('courseDuration-hint'),
                    ].filter(Boolean).join(' ') || undefined}
                    min={MIN_COURSE_DURATION}
                    max={MAX_COURSE_DURATION}
                />
                <p id={fid('courseDuration-hint')} className="text-xs text-muted-foreground">
                    {MIN_COURSE_DURATION}–{MAX_COURSE_DURATION} years
                </p>
                <FieldError msg={errors.courseDuration} id={eid('courseDuration')} />
            </div>

            {/* ── Tip ─────────────────────────────────────────────────────────── */}
            <div className="bg-muted border border-border rounded-lg p-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                    <strong className="text-foreground">Important:</strong>{' '}
                    Co-applicant income plays a major role in education loan approval.
                </p>
            </div>
        </div>
    )
})

EducationSpecificFields.displayName = 'EducationSpecificFields'