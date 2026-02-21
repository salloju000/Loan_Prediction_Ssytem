import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; expanded: boolean }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null, expanded: false }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, expanded: false }
    }

    componentDidCatch(error: Error, info: any) {
        console.error('═══ ERROR BOUNDARY CAUGHT ═══')
        console.error('Error:', error.message)
        console.error('Stack:', error.stack)
        console.error('Component stack:', info.componentStack)
        console.error('═════════════════════════════')
    }

    render() {
        if (!this.state.hasError) return this.props.children

        const { error, expanded } = this.state

        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-muted border border-border rounded-xl flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Something crashed</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                A rendering error occurred. Check the browser console (F12) for the full stack trace.
                            </p>
                        </div>
                    </div>

                    {/* Error message */}
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                        <p className="text-sm font-mono text-foreground break-all">
                            {error?.message ?? 'Unknown error'}
                        </p>
                    </div>

                    {/* Stack trace toggle */}
                    {error?.stack && (
                        <div className="mb-6">
                            <button
                                onClick={() => this.setState(s => ({ ...s, expanded: !s.expanded }))}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                {expanded ? 'Hide' : 'Show'} stack trace
                            </button>
                            {expanded && (
                                <pre className="mt-2 text-xs font-mono text-muted-foreground bg-muted border border-border rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                                    {error.stack}
                                </pre>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={() => this.setState({ hasError: false, error: null, expanded: false })}
                            variant="outline"
                            className="border-border text-foreground hover:bg-muted flex-1"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 flex-1"
                        >
                            Reload Page
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
}