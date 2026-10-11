import { line, curveCatmullRom, curveLinear } from 'd3-shape'
import { motion, useReducedMotion } from 'framer-motion'
import type { GNode, Route } from '../logic/routing'

export type RoutePhase = 'safe' | 'shortcut' | 'blocked' | 'reroute'

const smooth = line<GNode | { x: number; y: number }>().x((d) => d.x).y((d) => d.y).curve(curveCatmullRom.alpha(0.6))
const straight = line<GNode | { x: number; y: number }>().x((d) => d.x).y((d) => d.y).curve(curveLinear)

interface Props {
  safe: Route | null
  naive: Route | null
  /** index of the first node deeper than the mark in `naive` */
  violation: number
  phase: RoutePhase
  mark: number
}

export function boundaryPoint(naive: Route, violation: number) {
  const a = naive.points[violation - 1]
  const b = naive.points[violation]
  return { x: a.x + (b.x - a.x) * 0.55, y: a.y + (b.y - a.y) * 0.55 }
}

/** SVG layer (viewBox 100x66): lit route with travelling pulses, depth-violation stop + lock, level tags. */
export function SafeRoutePath({ safe, naive, violation, phase, mark }: Props) {
  const reduce = useReducedMotion()
  const showSafe = safe && (phase === 'safe' || phase === 'reroute')
  const safeD = safe ? smooth(safe.points) ?? '' : ''

  let shortcutD = ''
  let stop: { x: number; y: number } | null = null
  if (naive && violation > 0 && (phase === 'shortcut' || phase === 'blocked')) {
    stop = boundaryPoint(naive, violation)
    shortcutD = straight([...naive.points.slice(0, violation), stop]) ?? ''
  }

  return (
    <g>
      {shortcutD && (
        <>
          <motion.path
            key={`short-${phase === 'shortcut' ? 'draw' : 'hold'}`}
            d={shortcutD}
            fill="none"
            stroke="var(--glow-amber)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="3 2"
            initial={{ pathLength: phase === 'blocked' ? 1 : 0 }}
            animate={{ pathLength: 1, opacity: phase === 'blocked' ? [1, 0.2, 1, 0.3, 1, 0.15, 1] : 1 }}
            transition={{ duration: phase === 'blocked' ? 1.1 : 1.5, ease: 'easeInOut' }}
          />
          {phase === 'blocked' && stop && (
            <g transform={`translate(${stop.x} ${stop.y})`}>
              <circle r="4.6" fill="var(--locked-gray)" stroke="var(--glow-amber)" strokeWidth="0.8" />
              <rect x="-1.9" y="-0.4" width="3.8" height="2.9" rx="0.7" fill="none" stroke="var(--locked-text)" strokeWidth="0.7" />
              <path d="M -1.1 -0.4 V -1.4 a 1.1 1.1 0 0 1 2.2 0 V -0.4" fill="none" stroke="var(--locked-text)" strokeWidth="0.7" />
            </g>
          )}
        </>
      )}

      {showSafe && (
        <>
          <motion.path
            key={`safe-${phase}`}
            d={safeD}
            fill="none"
            stroke="var(--glow-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="3 2.2"
            style={{ filter: 'drop-shadow(0 0 1.6px var(--glow-cyan))' }}
            initial={{ pathLength: phase === 'reroute' ? 0 : 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
          {/* direction: travelling pulses (static chevrons when reduced motion is on) */}
          {!reduce
            ? [0, 1, 2].map((i) => (
                <circle key={i} r="1.5" fill="#fff" style={{ filter: 'drop-shadow(0 0 2px #fff)' }}>
                  <animateMotion dur="3.6s" begin={`${i * 1.2}s`} repeatCount="indefinite" path={safeD} />
                </circle>
              ))
            : safe!.points.slice(0, -1).map((p, i) => {
                const n = safe!.points[i + 1]
                const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2
                const ang = (Math.atan2(n.y - p.y, n.x - p.x) * 180) / Math.PI
                return <path key={i} d="M -1.6 -1.3 L 1.2 0 L -1.6 1.3 Z" fill="#fff" transform={`translate(${mx} ${my}) rotate(${ang})`} />
              })}
          {safe!.points.map((p) =>
            p.layer > 1 ? (
              <text key={p.id} x={p.x + 2.2} y={p.y - 1.6} fontSize="3.2" fontWeight="800" fill="var(--glow-cyan)">
                L{p.layer}
              </text>
            ) : null,
          )}
          {safe!.points.length > 0 && <title>Safe route, levels 1 to {mark}</title>}
        </>
      )}
    </g>
  )
}
