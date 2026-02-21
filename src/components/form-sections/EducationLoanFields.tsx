/**
 * components/form-sections/EducationLoanFields.tsx
 *
 * Loan-type-specific form section for education loans.
 * Shows: Course Type, Institution Tier, Study Location, Course Duration.
 * Extracted from EnterDetails.tsx.
 */

import { memo } from 'react'
import { AlertCircle, BookOpen } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { FormSectionProps } from './FormSectionContext'

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

export const EducationLoanFields = memo(({
    formData, errors, uid,
    update, inputCls, selectCls, describedBy,
    maxCourseDuration,
}: FormSectionProps) => {
    const fid = (f: string) => `${uid}-${f}`
    const eid = (f: string) => `${uid}-${f}-error`

    return (
        <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-foreground" aria-hidden="true" />
                Course Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                <div>
                    <Label htmlFor={fid('courseType')} className="text-sm text-foreground mb-1 block">Course Type *</Label>
                    <Select value={formData.courseType || ''} onValueChange={v => update('courseType', v)}>
                        <SelectTrigger
                            id={fid('courseType')}
                            className={selectCls('courseType')}
                            aria-invalid={!!errors.courseType}
                            aria-required="true"
                            aria-describedby={describedBy(errors.courseType ? eid('courseType') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            {(['Engineering', 'Medical', 'MBA', 'Law', 'Arts', 'Science'] as const).map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.courseType} id={eid('courseType')} />
                </div>

                <div>
                    <Label htmlFor={fid('institutionTier')} className="text-sm text-foreground mb-1 block">Institution Tier *</Label>
                    <Select value={formData.institutionTier || ''} onValueChange={v => update('institutionTier', v)}>
                        <SelectTrigger
                            id={fid('institutionTier')}
                            className={selectCls('institutionTier')}
                            aria-invalid={!!errors.institutionTier}
                            aria-required="true"
                            aria-describedby={describedBy(errors.institutionTier ? eid('institutionTier') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tier-1">Tier 1 — IIT / IIM / AIIMS</SelectItem>
                            <SelectItem value="Tier-2">Tier 2 — State / NITs</SelectItem>
                            <SelectItem value="Tier-3">Tier 3 — Private / Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.institutionTier} id={eid('institutionTier')} />
                </div>

                <div>
                    <Label htmlFor={fid('studyLocation')} className="text-sm text-foreground mb-1 block">Study Location *</Label>
                    <Select value={formData.studyLocation || ''} onValueChange={v => update('studyLocation', v)}>
                        <SelectTrigger
                            id={fid('studyLocation')}
                            className={selectCls('studyLocation')}
                            aria-invalid={!!errors.studyLocation}
                            aria-required="true"
                            aria-describedby={describedBy(errors.studyLocation ? eid('studyLocation') : null)}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="india">India</SelectItem>
                            <SelectItem value="abroad">Abroad</SelectItem>
                        </SelectContent>
                    </Select>
                    <FieldError msg={errors.studyLocation} id={eid('studyLocation')} />
                </div>

                <div>
                    <Label htmlFor={fid('courseDuration')} className="text-sm text-foreground mb-1 block">Course Duration (Years) *</Label>
                    <input
                        id={fid('courseDuration')}
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g., 4"
                        value={formData.courseDuration || ''}
                        onChange={e => update('courseDuration', e.target.value)}
                        className={inputCls('courseDuration')}
                        aria-describedby={describedBy(errors.courseDuration ? eid('courseDuration') : null)}
                        aria-invalid={!!errors.courseDuration}
                        aria-required="true"
                        min={1}
                        max={maxCourseDuration}
                    />
                    <FieldError msg={errors.courseDuration} id={eid('courseDuration')} />
                </div>

            </div>
        </div>
    )
})
EducationLoanFields.displayName = 'EducationLoanFields'
