import { motion } from 'framer-motion'
import { GlowDot } from './GlowDot'
import type { ColonyEval } from '../logic/escalation'
import type { Colony } from '../state/store'

const CHIP = {
  ESCALATED: { color: 'var(--glow-red)', word: 'SEEN', shape: '▲' },
  CRITICAL: { color: 'var(--glow-red)', word: 'DARK', shape: '◆' },
  WATCH: { color: 'var(--glow-amber)', word: 'WATCH', shape: '◐' },
} as const

interface Props {
  colony: Colony
  ev: ColonyEval
  onOpen: () => void
  onHandled: () => void
}

/**
 * One case row. Press the middle for the junction's story; press HANDLED on the side to send it away.
 * The row collapses (300 ms) when handled.
 */
export function CaseCard({ colony, ev, onOpen, onHandled }: Props) {
  const chip = ev.chip!
  const st = CHIP[chip]
  return (
    <motion.li
      layout
      className="list-none overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 88 }}
      exit={{ opacity: 0, height: 0, scale: 0.94, transition: { duration: 0.3 } }}
      data-case={colony.id}
      data-chip={chip}
    >
      <div className="flex h-[80px] gap-2">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${colony.junction}, ${colony.name}, ${st.word.toLowerCase()}. Open details.`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          style={{
            borderRadius: '30px 20px 30px 20px', paddingLeft: 12, paddingRight: 10,
            background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${st.color}`,
            ['--c' as string]: st.color,
          }}
        >
          <GlowDot health={ev.health} size={52} flagged={ev.flagged} />
          <span className="min-w-0 flex-1">
            <span className="t-body block" style={{ fontSize: 18, lineHeight: 1.15 }}>{colony.junction}</span>
            <span className="t-body block" style={{ color: 'var(--text-70)', fontSize: 15, lineHeight: 1.15 }}>{colony.name}</span>
            <span
              className="t-micro mt-1 inline-flex items-center gap-1 rounded-full px-2"
              style={{ color: st.color, border: `1.5px solid ${st.color}`, fontWeight: 800, lineHeight: '18px' }}
            >
              <span aria-hidden="true">{st.shape}</span>{st.word}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onHandled}
          aria-label={`Mark ${colony.junction} handled`}
          className="t-body grid shrink-0 place-items-center"
          style={{
            width: 80, borderRadius: '20px 30px 20px 30px', fontSize: 14,
            color: 'var(--warden-gold)', background: 'rgba(255,233,168,0.12)', border: '2px solid var(--warden-gold)',
          }}
        >
          HANDLED
        </button>
      </div>
    </motion.li>
  )
}
