import { useSyncExternalStore } from 'react'
import './water-view.css'
import { WaterRipple } from './WaterRipple'

/**
 * WATER VIEW: an optional "seen from underwater" look, to judge how readable the bands stay.
 *
 * Self-contained on purpose. To remove it completely:
 *   1. delete this file, water-view.css and WaterRipple.tsx
 *   2. in App.tsx remove the WaterView import, <WaterDefs />, <WaterBackdrop /> and <WaterToggle />
 *   3. in BandShell.tsx remove the WaterView import, the `water` style on the content wrapper and <WaterVeil />
 * Nothing else depends on it, and it is off by default.
 *
 * Layers (back to front):
 *   backdrop   page background: deep water, slow light rays, rising bubbles
 *   content    the band itself, gently wobbled by an SVG displacement filter
 *   veil       a teal tint with drifting caustics and hover/click ripples (WaterRipple), inside the band, UNDER the pulse circles
 *   pulses     AlertPulse (z-30 in BandShell) sits above the veil, so beats stay crisp on top of the water
 */

/* ---------------- tiny shared on/off state (no store changes needed) ---------------- */

const KEY = 'lumen-water-view'
let on = false
try { on = localStorage.getItem(KEY) === '1' } catch { /* storage blocked: stay off */ }
const subs = new Set<() => void>()
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const setOn = (v: boolean) => {
  on = v
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* ignore */ }
  subs.forEach((f) => f())
}
export const useWaterView = () => useSyncExternalStore(subscribe, () => on, () => false)

/* ---------------- toggle, bottom left ---------------- */

export function WaterToggle() {
  const active = useWaterView()
  return (
    <button
      type="button"
      onClick={() => setOn(!active)}
      aria-pressed={active}
      aria-label="Water view: see the site as if underwater"
      title={active ? 'Water view: on' : 'Water view: off'}
      className="fixed bottom-3 left-3 z-40 grid place-items-center rounded-full"
      style={{
        width: 52, height: 52,
        background: active ? 'rgba(77,232,210,0.28)' : 'rgba(4,18,31,0.9)',
        border: `2px solid ${active ? 'var(--glow-cyan)' : 'rgba(98,139,123,0.7)'}`,
        color: active ? 'var(--living-light)' : 'var(--text)',
        boxShadow: active ? '0 0 18px rgba(77,232,210,0.5)' : undefined,
      }}
    >
      <svg width="26" height="20" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M1 5c3-3 5 3 8 0s5 3 8 0 5 3 6 1M1 12c3-3 5 3 8 0s5 3 8 0 5 3 6 1" />
      </svg>
    </button>
  )
}

/* ---------------- SVG filter: a slow underwater wobble for the band content ---------------- */

export function WaterDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="lumen-water" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="2" seed="4" result="n">
            <animate attributeName="baseFrequency" dur="14s" values="0.009 0.013;0.013 0.009;0.009 0.013" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}

/** Style for the band's content wrapper: wobbled and slightly deepened when water view is on. */
export function useWaterStyle(): React.CSSProperties | undefined {
  const active = useWaterView()
  return active ? { filter: 'url(#lumen-water) saturate(0.9) brightness(0.95)' } : undefined
}

/* ---------------- veil: tint + caustics inside a band, under the pulses ---------------- */

export function WaterVeil() {
  const active = useWaterView()
  if (!active) return null
  return (
    <div className="water-veil pointer-events-none absolute inset-0 z-[25] overflow-hidden" style={{ borderRadius: 36 }} aria-hidden="true">
      <div className="water-tint absolute inset-0" />
      <div className="water-waves absolute inset-0" />
      <div className="water-waves water-waves-2 absolute inset-0" />
      <WaterRipple variant="band" className="absolute inset-0" hoverStrength={0.04} clickStrength={0.12} rippleSize={20} rippleSpeed={0.8} hoverFade={0.9} clickFade={2.6} highlight={[0.7, 1, 0.95]} />
      <div className="water-surface absolute inset-x-0 top-0" />
    </div>
  )
}

/* ---------------- backdrop: the page itself becomes deep water ---------------- */

const BUBBLES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 5 + ((i * 13) % 16),
  dur: 14 + ((i * 7) % 14),
  delay: -((i * 5) % 24),
  sway: 10 + ((i * 3) % 18),
}))

export function WaterBackdrop() {
  const active = useWaterView()
  if (!active) return null
  return (
    <div className="water-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="water-depth absolute inset-0" />
      <div className="water-rays absolute inset-0" />
      <div className="water-rays water-rays-2 absolute inset-0" />
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="water-bubble absolute rounded-full"
          style={{
            left: `${b.left}%`, bottom: -40, width: b.size, height: b.size,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ['--sway' as string]: `${b.sway}px`,
          }}
        />
      ))}
      <div className="water-vignette absolute inset-0" />
      <WaterRipple variant="page" className="absolute inset-0" />
    </div>
  )
}
