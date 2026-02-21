import { memo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft } from 'lucide-react'

/**
 * ResultsSkeleton.tsx
 *
 * A specialized skeleton loader that mimics the structure of Results.tsx.
 * Used to provide contextual feedback while the ML model is processing.
 */
export const ResultsSkeleton = memo(() => {
    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-12 animate-in fade-in duration-500">

            {/* Back Link Placeholder */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground transition-colors w-fit opacity-50">
                <ChevronLeft className="h-4 w-4" /> Back to Form
            </div>

            {/* Hero Card Skeleton */}
            <div className="border border-border rounded-xl p-6 bg-card">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-14 w-14 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-80" />
                            <Skeleton className="h-6 w-24 rounded-full mt-2" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                </div>

                {/* Key Numbers Grid Skeleton */}
                <div className="grid grid-cols-3 gap-0 mt-6 pt-6 border-t border-border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex flex-col items-center gap-2 ${i < 3 ? 'border-r border-border' : ''}`}>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-7 w-32" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Financial Health + Credit Profile Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2].map((i) => (
                    <div key={i} className="border border-border rounded-xl p-6 bg-card space-y-4">
                        <Skeleton className="h-3 w-32 mb-4" />
                        {[1, 2, 3, 4, 5, 6].map((j) => (
                            <div key={j} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Summary Pills Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border border-border rounded-xl p-4 bg-card space-y-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-5 w-24" />
                    </div>
                ))}
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Skeleton className="h-11 w-44 rounded-md" />
                <Skeleton className="h-11 w-44 rounded-md" />
            </div>

        </div>
    )
})

ResultsSkeleton.displayName = 'ResultsSkeleton'
