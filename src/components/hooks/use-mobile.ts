/**
 * use-mobile.ts — Responsive breakpoint hook
 *
 * Provides a `useIsMobile()` hook that returns true when the
 * browser viewport is narrower than MOBILE_BREAKPOINT (768 px).
 *
 * Uses the MediaQueryList API for efficient change detection instead
 * of polling window.innerWidth on every render.
 *
 * Usage:
 *   const isMobile = useIsMobile()
 *   if (isMobile) { ... show compact layout ... }
 */

import { useState, useEffect } from "react"

// Tailwind's default `sm` breakpoint — screens below this are "mobile"
const MOBILE_BREAKPOINT = 768

// Pre-build the query string once at module level — no allocation per hook call
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile(): boolean {
  // Initialise from matchMedia directly so the very first render is correct.
  // Falls back to false in SSR environments where window is undefined.
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)

    // Use mql.matches instead of re-reading window.innerWidth —
    // stays consistent with the media query we're actually listening to.
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)

    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, []) // Run only once on mount

  return isMobile
}