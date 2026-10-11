import { motion } from 'framer-motion'
import { WaterMap } from '../components/LightMap'
import { GlowDot } from '../components/GlowDot'
import { citizenById, useStore } from '../state/store'

/** The big water-map. Press the colony you are near to report theft there. */
export function ExpandedMap({ onBack, onPick }: { onBack: () => void; onPick: (id: string) => void }) {
  const colonies = useStore((s) => s.colonies)
  const me = citizenById(useStore((s) => s.citizenId))
  const home = colonies.find((c) => c.id === me.colonyId)
  const x0 = Math.max(0, Math.min(34, me.x - 33))
  const link = useStore((s) => s.link)
  const dim = link === 'lost'
  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col items-center px-4 pb-2"
      style={{ background: 'linear-gradient(180deg, var(--abyss-2), var(--abyss))' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      data-testid="expanded-map"
    >
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          className="grid place-items-center rounded-full"
          style={{ width: 64, height: 64, border: '2px solid var(--glow-cyan)', background: 'rgba(77,232,210,0.1)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--glow-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <p className="t-body flex-1" style={{ fontSize: 17, lineHeight: 1.2 }}>Press the light you saw it near</p>
      </div>

      <div className="mt-2">
        <WaterMap
          view={{ x0, y0: 4, x1: x0 + 66, y1: 66 }}
          w={328} h={308}
          colonies={colonies}
          onPick={onPick}
          you={me}
          youLabel={`You · ${home?.junction ?? 'Level 1'}`}
          dot={50} dim={dim} soft={link === 'weak'}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-5">
        {(['healthy', 'weak', 'dying'] as const).map((h) => (
          <span key={h} className="t-micro flex items-center gap-1.5" style={{ color: 'var(--text)', fontSize: 13 }}>
            <GlowDot health={h} size={28} still />
            {h === 'healthy' ? 'calm' : h === 'weak' ? 'fading' : 'dark'}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
