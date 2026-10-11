import { useReducedMotion } from 'framer-motion'
import type { LinkState } from '../state/store'

/**
 * The Current link, drawn as the band's own edge. No label, no bars, no layout space.
 * connected: steady cyan (no travelling light); weak: thin, gapped, flickering;
 * lost: frozen gray dashes; reconnecting: one bright sweep.
 */
export function LinkRing({ state }: { state: LinkState }) {
  const reduce = useReducedMotion()
  const common = { x: 4, y: 4, width: 352, height: 632, rx: 32, fill: 'none' as const }
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40"
      width="360"
      height="640"
      viewBox="0 0 360 640"
      aria-hidden="true"
      data-testid="link-ring"
      data-state={state}
    >
      <defs>
        <filter id="ring-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {(state === 'connected' || state === 'reconnecting') && (
        <>
          <rect {...common} stroke="var(--glow-cyan)" strokeWidth="2" opacity={state === 'reconnecting' ? 0.9 : 0.75} filter="url(#ring-bloom)" />
          {!reduce && state === 'reconnecting' && (
            <rect
              {...common}
              stroke="#ffffff"
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={1000}
              strokeDasharray="260 740"
              style={{
                animation: 'sweep 1.3s ease-in-out 1 forwards',
              }}
              opacity={0.9}
              filter="url(#ring-bloom)"
            />
          )}
        </>
      )}
      {state === 'weak' && (
        <rect
          {...common}
          stroke="var(--glow-cyan)"
          strokeWidth="1"
          strokeDasharray="16 9 5 11"
          className="flicker"
          style={{ animationDuration: '3.9s' }}
        />
      )}
      {state === 'lost' && (
        <rect {...common} stroke="var(--locked-gray)" strokeWidth="1.5" strokeDasharray="7 7" opacity="0.95" />
      )}
    </svg>
  )
}
