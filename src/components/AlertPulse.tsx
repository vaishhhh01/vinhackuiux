import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PULSE_COLOR, type PulseKind } from './PulseHaptics'
import type { PulseEvent } from '../state/store'

interface Spec { rings: number; dur: number; gap: number; stroke: number; wash: number }
const SPEC: Record<PulseKind, Spec> = {
  info: { rings: 1, dur: 1.6, gap: 0, stroke: 3, wash: 0.1 },
  caution: { rings: 2, dur: 2.4, gap: 0.9, stroke: 3, wash: 0.12 },
  danger: { rings: 2, dur: 0.8, gap: 0.22, stroke: 5, wash: 0.22 },
  allClear: { rings: 1, dur: 3.4, gap: 0, stroke: 4, wash: 0.16 },
  warden: { rings: 1, dur: 2, gap: 0, stroke: 9, wash: 0.14 },
}

function Rings({ kind, repeat }: { kind: PulseKind; repeat?: boolean }) {
  const reduce = useReducedMotion()
  const s = SPEC[kind]
  const color = PULSE_COLOR[kind]
  // The pattern is the number and rhythm of beats: 1 soft, 2 slow, 2 fast, 1 long, 1 heavy.
  // Each beat is a circle that throbs out from the centre of the band and fades as it grows.
  const size = 200
  return (
    <div className="absolute inset-0 grid place-items-center">
      {Array.from({ length: s.rings }, (_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size, height: size,
            border: `${s.stroke}px solid ${color}`,
            background: `radial-gradient(circle, color-mix(in srgb, ${color} ${Math.round(s.wash * 150)}%, transparent) 0%, transparent 70%)`,
            boxShadow: `0 0 ${kind === 'warden' ? 38 : 24}px ${color}, inset 0 0 ${kind === 'warden' ? 30 : 18}px ${color}`,
          }}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={reduce ? { opacity: [0, 0.9, 0], scale: 1 } : { opacity: [0, 0.95, 0.5, 0], scale: [0.2, 0.85, 2.4, 3.6] }}
          transition={{
            duration: s.dur, delay: i * s.gap, ease: 'easeOut',
            repeat: repeat ? 1 : 0, repeatDelay: repeat ? s.gap : 0,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Circle beats in the pulse colour, throbbing out from the centre. Kinds map 1:1 to the alert hierarchy.
 * `danger` pulses exactly twice, then the band settles (the map grows instead).
 */
export function AlertPulse({ event, persistentDanger }: { event?: PulseEvent; persistentDanger?: boolean }) {
  const [shown, setShown] = useState<PulseEvent | null>(null)
  useEffect(() => {
    if (!event) return
    setShown(event)
    const ms = (SPEC[event.kind].dur + SPEC[event.kind].gap * 2) * 1000 + 300
    const t = setTimeout(() => setShown((s) => (s?.id === event.id ? null : s)), ms)
    return () => clearTimeout(t)
  }, [event?.id])

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[36px]" aria-hidden="true">
      <AnimatePresence>
        {persistentDanger ? (
          <motion.div key="danger" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Rings kind="danger" repeat />
          </motion.div>
        ) : (
          shown && (
            <motion.div key={shown.id} className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Rings kind={shown.kind} />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
