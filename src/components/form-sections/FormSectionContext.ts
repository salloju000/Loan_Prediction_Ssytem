/**
 * components/form-sections/FormSectionContext.ts
 *
 * Shared prop types passed into every loan-type-specific form section component.
 * Avoids duplicating the same interface across HomeLoanFields, CarLoanFields, etc.
 */

import type { FormData, CurrencyCode } from '../../lib/types'
import type { FieldErrors } from '../pages/EnterDetails'

export interface FormSectionProps {
    /** Current form state from EnterDetails */
    formData: FormData
    /** Field error map (client + server merged) */
    errors: FieldErrors
    /** Stable per-form-instance ID prefix — produces unique aria IDs */
    uid: string
    /** Update a single form field */
    update: (field: keyof FormData, value: string | number) => void
    /** Input CSS class based on presence of an error */
    inputCls: (field: string) => string
    /** Select trigger CSS class based on presence of an error */
    selectCls: (field: string) => string
    /** Build deduped aria-describedby string from a list of possibly-falsy IDs */
    describedBy: (...ids: (string | undefined | false | null)[]) => string | undefined
    /** Computed minimum down payment (may be null if price not yet entered) */
    minDownPayment: number | null
    /** Computed LTV ratio string (home only, may be null) */
    ltvRatio: string | null
    /** Max vehicle age constant */
    maxVehicleAge: number
    /** Max course duration constant */
    maxCourseDuration: number
    /** Current selected currency */
    currency: CurrencyCode
}
