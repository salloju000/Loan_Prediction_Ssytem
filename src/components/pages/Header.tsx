/**
 * Header.tsx — Sticky top navigation bar
 *
 * Renders a minimal header containing:
 *   - The app logo image (imported as a static asset)
 *   - The "LoanPredict" brand name (hidden on very small screens via `hidden sm:inline`)
 *
 * The entire logo+name group acts as a clickable button. Clicking it calls
 * `onLogoClick`, which is wired to `resetForm()` in App.tsx — effectively
 * navigating the user back to Step 1 (loan type selection).
 *
 * The header is `sticky top-0 z-50` so it remains visible while scrolling.
 */

import logo from '../../assets/logo.png'  // SVG/PNG logo asset
import { History as HistoryIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../ui/ThemeToggle'
import { CurrencySelector } from '../ui/CurrencySelector'
import { Button } from '../ui/button'
import type { CurrencyCode } from '../../lib/types'


// ── Props ─────────────────────────────────────────────────────────────────────
interface HeaderProps {
    /** Called when the user clicks the logo — used to reset/navigate home */
    onLogoClick: () => void
    currency: CurrencyCode
    onCurrencyChange: (code: CurrencyCode) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export const Header = ({ onLogoClick, currency, onCurrencyChange }: HeaderProps) => {
    return (
        // Sticky header — stays at top of viewport during scroll
        <header className="sticky top-0 z-50 bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">
                <div className="flex items-center h-16">

                    {/* Logo button — resets the app to Step 1 when clicked */}
                    <button
                        onClick={onLogoClick}
                        aria-label="Go to home"
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity focus:outline-none"
                    >
                        {/* App logo image */}
                        <img src={logo} alt="LoanPredict Logo" className="w-8 h-8 object-contain" />

                        {/* Brand name — hidden on xs screens to save space */}
                        <span className="text-base font-semibold text-foreground hidden sm:inline">
                            LoanPredict
                        </span>
                    </button>
                    {/* Theme Toggle & History — pushed to the right */}
                    <div className="ml-auto flex items-center gap-3">
                        <CurrencySelector current={currency} onChange={onCurrencyChange} />
                        <Link to="/history">

                            <Button variant="ghost" size="icon" className="h-9 w-9 border border-border bg-card text-foreground" title="History">
                                <HistoryIcon className="h-4 w-4" />
                                <span className="sr-only">History</span>
                            </Button>
                        </Link>
                        <ThemeToggle />
                    </div>

                </div>
            </div>
        </header>
    )
}
