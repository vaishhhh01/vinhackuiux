import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PulseHaptics } from './PulseHaptics'
import { useStore } from '../state/store'

export type PadState = 'idle' | 'done' | 'saved' | 'declared' | 'waiting'
type Tone = 'report' | 'declare' | 'safe' | 'muted'

interface Props {
  label: string
  holdLabel?: string
  sub?: string
  onComplete: () => void
  onBlocked?: () => void
  holdMs?: number
  shape?: 'circle' | 'pill'
  size?: number
  width?: number
  height?: number
  tone?: Tone
  state?: PadState
  doneLabel?: string
  doneSub?: string
  icon?: 'triangle' | 'none'
  breathing?: boolean
  ariaLabel: string
  autoReset?: boolean
  className?: string
}

const TONE_COLOR: Record<Tone, string> = {
  report: 'var(--glow-red)',
  declare: 'var(--glow-red)',
  safe: 'var(--glow-cyan)',
  muted: 'var(--locked-gray)',
}

/**
 * Press-and-hold pad. 1000 ms fill, soft drain on early release, nothing fires until the ring is full.
 * Pointer pressure (when the digitiser reports it) speeds the fill up to 1.5x; otherwise it is the plain 1 s hold.
 * Keyboard: hold Space or Enter.
 */
export function PressureButton({
  label, holdLabel = 'keep holding', sub, onComplete, onBlocked, holdMs = 1000, shape = 'circle',
  size = 220, width = 328, height = 72, tone = 'report', state = 'idle', doneLabel, doneSub,
  icon = 'triangle', breathing, ariaLabel, autoReset = true, className = '',
}: Props) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const say = useStore((s) => s.say)
  const [p, setP] = useState(0)
  const [holding, setHolding] = useState(false)
  const [shake, setShake] = useState(0)
  const [tooShort, setTooShort] = useState(false)
  const pRef = useRef(0)
  const holdingRef = useRef(false)
  const doneRef = useRef(false)
  const boostRef = useRef(0)
  const lastTick = useRef(0)
  const raf = useRef(0)
  const lastHaptic = useRef(0)
  const muted = tone === 'muted'
  const locked = state !== 'idle'

  const stopLoop = () => { clearInterval(raf.current); raf.current = 0 }

  // time-based (performance.now) so a throttled or hidden tab can never stretch the 1 s hold
  const startLoop = () => {
    if (!raf.current) raf.current = window.setInterval(() => loopRef.current(performance.now()), 16)
  }
  const loopRef = useRef<(t: number) => void>(() => undefined)

  const loop = useCallback((t: number) => {
    const dt = lastTick.current ? Math.min(64, t - lastTick.current) : 16
    lastTick.current = t
    if (holdingRef.current && !doneRef.current) {
      pRef.current = Math.min(1, pRef.current + (dt / holdMs) * (1 + 0.5 * boostRef.current))
      if (pRef.current - lastHaptic.current > 0.2) {
        lastHaptic.current = pRef.current
        PulseHaptics.tick(8 + Math.round(pRef.current * 24))
      }
      if (pRef.current >= 1) {
        doneRef.current = true
        holdingRef.current = false
        setHolding(false)
        PulseHaptics.play('info')
        onComplete()
        if (autoReset) {
          setTimeout(() => { if (doneRef.current) { doneRef.current = false; pRef.current = 0; setP(0) } }, 1100)
        }
      }
    } else if (!holdingRef.current && !doneRef.current && pRef.current > 0) {
      // soft drain: ~350 ms from full to empty
      pRef.current = Math.max(0, pRef.current - dt / 350)
      lastHaptic.current = Math.min(lastHaptic.current, pRef.current)
    }
    setP(pRef.current)
    const live = holdingRef.current || (!doneRef.current && pRef.current > 0)
    if (!live) { stopLoop(); lastTick.current = 0 }
  }, [holdMs, onComplete, autoReset])
  loopRef.current = loop

  const begin = (pressure = 0.5, type = 'mouse') => {
    if (doneRef.current || locked) return
    if (muted) {
      setShake((n) => n + 1)
      onBlocked?.()
      return
    }
    boostRef.current = type === 'mouse' ? 0 : Math.max(0, Math.min(1, (pressure - 0.5) * 2))
    holdingRef.current = true
    setHolding(true)
    startLoop()
  }
  const end = () => {
    if (!holdingRef.current) return
    holdingRef.current = false
    setHolding(false)
    if (!doneRef.current && pRef.current > 0.02 && pRef.current < 1) {
      say('Keep holding until the ring is full', false)
      setTooShort(true)
      setTimeout(() => setTooShort(false), 1600)
    }
    startLoop()
  }

  useEffect(() => stopLoop, [])
  useEffect(() => {
    if (state === 'idle' && !holdingRef.current) {
      doneRef.current = false
      pRef.current = 0
      setP(0)
    }
  }, [state])

  const c = TONE_COLOR[tone]
  const showDone = state !== 'idle'
  const active = holding || p > 0
  const mainLabel = showDone ? doneLabel ?? label : active ? holdLabel : label
  const subLabel = showDone ? doneSub ?? sub : active ? undefined : tooShort ? 'hold until the ring is full' : sub

  const events = {
    onPointerDown: (e: React.PointerEvent) => {
      try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* synthetic or already released */ }
      begin(e.pressure || 0.5, e.pointerType)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (holdingRef.current && e.pointerType !== 'mouse') boostRef.current = Math.max(0, Math.min(1, ((e.pressure || 0.5) - 0.5) * 2))
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(0.5, 'key') }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end() }
    },
    onBlur: end,
  }

  const common = {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': ariaLabel,
    'aria-disabled': muted || locked || undefined,
    'data-nodrag': true,
    'data-testid': 'pressure-pad',
    'data-progress': p.toFixed(2),
    style: { touchAction: 'none' as const, ['--c' as string]: c, userSelect: 'none' as const, WebkitUserSelect: 'none' as const },
    ...events,
  }

  if (shape === 'circle') {
    const r = size / 2 - 8
    const C = 2 * Math.PI * r
    return (
      <motion.div
        {...common}
        key={shake}
        animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
        className={`relative grid cursor-pointer place-items-center rounded-full outline-none ${className}`}
        style={{ ...common.style, ['--c' as string]: showDone ? 'var(--glow-cyan)' : c, width: size, height: size }}
      >
        <AnimatePresence>
          {holding && !reduce &&
            [0, 1].map((i) => (
              <motion.span
                key={`halo${i}`}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: 'var(--glow-amber)' }}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.35 + p * 0.25, opacity: 0 }}
                transition={{ duration: 0.9 - p * 0.35, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 bloomf-lg" aria-hidden="true">
          <defs>
            <radialGradient id={`pad${uid}`} cx="50%" cy="50%" r="55%">
              <stop offset="0" stopColor={showDone ? '#1b5a66' : '#5a1a1f'} />
              <stop offset="1" stopColor={showDone ? '#0a2236' : '#22090f'} />
            </radialGradient>
            <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff5a5a" />
              <stop offset="1" stopColor="#ffb347" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r - 4} fill={`url(#pad${uid})`} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4"
            stroke={showDone ? 'var(--glow-cyan)' : muted ? 'var(--locked-gray)' : 'var(--glow-red)'}
            className={breathing || state === 'saved' || state === 'waiting' ? 'pulse-slow' : ''}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="9" strokeLinecap="round"
            stroke={`url(#fill${uid})`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - (showDone ? 1 : p))}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            opacity={showDone ? 0 : 1}
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center gap-1 px-6 text-center">
          {showDone ? (
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" className="bloomf-sm" style={{ ['--c' as string]: 'var(--glow-cyan)' }}>
              <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="var(--glow-cyan)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : icon === 'triangle' ? (
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.5L22 20.5H2z" fill="rgba(255,90,90,0.25)" stroke="var(--glow-red)" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v5M12 17.6v.4" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : null}
          <span className="t-hero leading-tight" style={{ color: showDone ? 'var(--glow-cyan)' : 'var(--text)' }}>
            {mainLabel}
          </span>
          {subLabel && <span className="t-micro">{subLabel}</span>}
        </div>
      </motion.div>
    )
  }

  // pill (declare danger, report from colony, "I'm safe")
  const flooded = state === 'declared'
  return (
    <motion.div
      {...common}
      key={shake}
      animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
      className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full outline-none ${muted ? '' : breathing && !active ? 'pulse-slow' : ''} ${muted ? '' : 'bloom-lg'} ${className}`}
      style={{
        ...common.style,
        width, height,
        border: `4px solid ${muted ? 'var(--locked-gray)' : c}`,
        background: muted ? 'var(--locked-gray)' : tone === 'safe' ? '#0a2a36' : '#3a0d14',
      }}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${(flooded || showDone ? 1 : p) * 100}%`,
          background: tone === 'safe' ? 'linear-gradient(90deg,#1f8f86,#4de8d2)' : 'linear-gradient(90deg,#ff5a5a,#ffb347)',
          opacity: flooded ? 1 : 0.9,
          boxShadow: flooded || p > 0 ? '0 0 24px rgba(255,120,70,0.7)' : undefined,
        }}
      />
      <AnimatePresence>
        {flooded && (
          <motion.span
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 50%, #ff8a7a, #ff2d3d 60%, #8a0f1f)' }}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(100% at 50% 50%)' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <div className="relative z-10 flex flex-col items-center px-3 text-center leading-tight">
        <span className="t-body" style={{ fontSize: 14, letterSpacing: '0.06em', color: muted ? 'var(--locked-text)' : '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
          {mainLabel}
        </span>
        {subLabel && (
          <span className="t-micro" style={{ color: muted ? 'var(--locked-text)' : 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {subLabel}
          </span>
        )}
      </div>
    </motion.div>
  )
}
