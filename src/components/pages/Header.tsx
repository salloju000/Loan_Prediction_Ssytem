/**
 * Header.tsx — Sticky top navigation bar
 *
 * Renders a minimal header containing:
 *   - The app logo image (imported as a static asset)
 *   - The "LOAN · PREDICTION" Variant 2 text logo beside it
 *
 * The entire logo+name group acts as a clickable button. Clicking it calls
 * `onLogoClick`, which is wired to `resetForm()` in App.tsx — effectively
 * navigating the user back to Step 1 (loan type selection).
 *
 * The header is `sticky top-0 z-50` so it remains visible while scrolling.
 */

import logo from '../../assets/logo.png'
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
        <header className="sticky top-0 z-50 bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">
                <div className="flex items-center h-16">

                    {/* Logo button — resets the app to Step 1 when clicked */}
                    <button
                        onClick={onLogoClick}
                        aria-label="Go to home"
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity focus:outline-none"
                    >
                        {/* App logo image — kept as-is */}
                        <img src={logo} alt="LoanPredict Logo" className="w-8 h-8 object-contain" />

                        {/*
                         * Variant 2 text logo: LOAN · dot · PREDICTION
                         * Hidden on xs screens to save space.
                         */}
                        <span className="hidden sm:flex items-baseline leading-none gap-0">

                            {/* LOAN — heavy weight, adapts to theme via CSS var */}
                            <span
                                style={{
                                    fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
                                    fontWeight: 800,
                                    fontSize: '20px',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    lineHeight: 1,
                                    color: 'var(--foreground)',
                                }}
                            >
                                LOAN
                            </span>

                            {/* Cyan dot separator */}
                            <span
                                aria-hidden="true"
                                style={{
                                    display: 'inline-block',
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: '#00c6ff',
                                    margin: '0 5px 3px',
                                    flexShrink: 0,
                                }}
                            />

                            {/* PREDICTION — light weight, blue */}
                            <span
                                style={{
                                    fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
                                    fontWeight: 300,
                                    fontSize: '20px',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    lineHeight: 1,
                                    color: '#1a4bbd',
                                }}
                            >
                                PREDICTION
                            </span>
                        </span>
                    </button>

                    {/* Right side controls — pushed to the far right */}
                    <div className="ml-auto flex items-center gap-3">
                        <CurrencySelector current={currency} onChange={onCurrencyChange} />
                        <Link to="/history">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 border border-border bg-card text-foreground"
                                title="History"
                            >
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