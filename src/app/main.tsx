/**
 * main.tsx — Application entry point
 *
 * This is the very first file that runs when the app loads.
 * It mounts the root React component (<App />) into the <div id="root">
 * element defined in index.html.
 *
 * StrictMode is enabled to surface potential issues in development
 * (e.g. double-invoked effects, deprecated API warnings). It has no
 * effect in production builds.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'   // global styles, Tailwind base layers, CSS variables
import App from './App' // root application component

// Mount the React app.
// The "!" tells TypeScript the element definitely exists (non-null assertion).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)