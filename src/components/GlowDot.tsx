import { useId } from 'react'
import type { Health } from '../logic/thresholds'

export const HEALTH_COLOR: Record<Health, string> = {
  healthy: 'var(--glow-cyan)',
  weak: 'var(--glow-amber)',
  dying: 'var(--glow-red)',
}
export const HEALTH_WORD: Record<Health, string> = { healthy: 'healthy', weak: 'fading', dying: 'going dark' }

interface Props {
  health: Health
  size: number
  hazy?: boolean
  flagged?: boolean
  still?: boolean
  className?: string
}

const BELL = 'M 22 52 C 22 20, 78 20, 78 52 Q 70 60 62 53 Q 54 60 46 53 Q 38 60 30 53 Q 26 56 22 52 Z'

/**
 * One Ilyri colony, drawn as a small jellyfish. Never colour alone:
 *  healthy = full round bell, steady glow, tentacles sway
 *  fading  = amber, smaller bell under a half-ring, slow pulse
 *  dying   = red, drooping bell with a solid triangle, fast double pulse
 */
export function GlowDot({ health, size, hazy, flagged, still, className = '' }: Props) {
  const uid = useId().replace(/:/g, '')
  const c = HEALTH_COLOR[health]
  const anim = still ? '' : health === 'healthy' ? 'pulse-steady' : health === 'weak' ? 'pulse-slow' : 'pulse-double'
  const droop = health === 'dying'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`${size >= 40 ? 'bloomf-md' : 'bloomf-sm'} ${className}`}
      style={{
        ['--c' as string]: c,
        filter: hazy ? 'blur(1.6px) saturate(0.5)' : undefined,
        opacity: hazy ? 0.55 : 1,
        overflow: 'visible',
      }}
    >
      <defs>
        <radialGradient id={`g${uid}`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.4" stopColor={health === 'healthy' ? 'var(--living-light)' : c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.45" />
        </radialGradient>
      </defs>
      {flagged && <circle cx="50" cy="48" r="46" fill="none" stroke={c} strokeWidth="2.5" strokeDasharray="4 7" className="flicker" />}
      <g className={anim}>
        {health === 'weak' && <path d="M 14 50 A 36 36 0 0 1 86 50" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />}
        <g transform={health === 'weak' ? 'translate(50 52) scale(0.84) translate(-50 -52)' : droop ? 'translate(50 40) scale(1 0.8) translate(-50 -40)' : undefined}>
          <path d={BELL} fill={`url(#g${uid})`} />
        </g>
        {droop && <path d="M 50 34 L 62 54 L 38 54 Z" fill="var(--abyss)" opacity="0.85" />}
        {[34, 50, 66].map((x, i) => (
          <path
            key={x}
            d={`M ${x} 56 q ${i === 1 ? -6 : 6} ${droop ? 8 : 12} 0 ${droop ? 16 : 24} t 0 ${droop ? 10 : 14}`}
            fill="none"
            stroke={c}
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.85"
            className={still ? '' : 'sway'}
            style={{ animationDelay: `${i * 0.5}s`, transformBox: 'fill-box' }}
          />
        ))}
      </g>
    </svg>
  )
}
