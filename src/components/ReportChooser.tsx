import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowDot } from './GlowDot'
import { healthOf } from '../logic/thresholds'
import type { Colony } from '../state/store'

const AUTO_FADE_MS = 8000

interface Props {
  nearest: Colony[]
  onPick: (colonyId: string | null) => void
  onDone: () => void
}

/**
 * Optional "Where are they going?" card: three nearest colonies as big glow-dots + a DON'T KNOW bubble.
 * No typing. Ignoring it for 8 s fades it away; the report was already valid.
 */
export function ReportChooser({ nearest, onPick, onDone }: Props) {
  const [picked, setPicked] = useState<string | 'unknown' | null>(null)

  useEffect(() => {
    if (picked) {
      const t = setTimeout(onDone, 1400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(onDone, AUTO_FADE_MS)
    return () => clearTimeout(t)
  }, [picked])

  const pick = (id: string | null) => {
    setPicked(id ?? 'unknown')
    onPick(id)
  }

  return (
    <motion.section
      aria-label="Where are they going? Optional."
      className="relative rounded-[28px] px-3 pb-3 pt-2.5"
      style={{ background: 'rgba(10,34,54,0.85)', border: '1px solid rgba(77,232,210,0.3)' }}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.6 } }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      data-nodrag
    >
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="t-body" style={{ fontSize: 14 }}>Where are they going?</h3>
        <span className="t-micro">optional</span>
      </div>
      <div className="flex items-start justify-between gap-1.5">
        {nearest.map((c) => {
          const sel = picked === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              aria-label={`Heading to ${c.name}`}
              aria-pressed={sel}
              className="flex w-[74px] flex-col items-center gap-1 rounded-2xl p-0.5"
            >
              <span
                className={`relative grid place-items-center rounded-full ${sel ? 'bloom-lg' : ''}`}
                style={{ width: 72, height: 72, ['--c' as string]: 'var(--glow-cyan)', background: sel ? 'rgba(77,232,210,0.25)' : 'rgba(255,255,255,0.03)', border: sel ? '2px solid var(--glow-cyan)' : '1px solid rgba(77,232,210,0.25)' }}
              >
                <GlowDot health={healthOf(c.glow)} size={56} still={!sel} />
                {sel && <span className="t-micro absolute -top-1 right-0 rounded-full bg-[var(--glow-cyan)] px-1.5 text-[10px] font-extrabold text-[#04121f]">ADDED</span>}
              </span>
              <span className="t-micro text-center leading-tight" style={{ color: 'var(--text)' }}>{c.name}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => pick(null)}
          aria-label="Don't know"
          aria-pressed={picked === 'unknown'}
          className="grid place-items-center rounded-full text-center"
          style={{
            width: 72, height: 72, marginTop: 2,
            background: picked === 'unknown' ? 'rgba(216,243,239,0.18)' : 'rgba(216,243,239,0.06)',
            border: '1.5px dashed rgba(216,243,239,0.45)',
          }}
        >
          <span className="t-micro leading-tight" style={{ color: 'var(--text)' }}>DON'T<br />KNOW</span>
        </button>
      </div>
      {!picked && (
        <motion.span
          className="absolute bottom-0 left-6 right-6 h-[3px] origin-left rounded-full bg-[var(--glow-cyan)] opacity-60"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: AUTO_FADE_MS / 1000, ease: 'linear' }}
          aria-hidden="true"
        />
      )}
    </motion.section>
  )
}
