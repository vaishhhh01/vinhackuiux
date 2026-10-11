import { motion, useDragControls } from 'framer-motion'
import { PressureButton } from './PressureButton'
import { GlowDot } from './GlowDot'
import { healthOf } from '../logic/thresholds'
import type { ColonyEval } from '../logic/escalation'
import type { Colony } from '../state/store'

interface Props {
  colony: Colony
  ev: ColonyEval
  ageMin: number
  stale: boolean
  origin: { x: number; y: number }
  onClose: () => void
  onPatrol: () => void
  onDeclare: () => void
}

/** Grows out of the gold ring (radial reveal, 350 ms) and shrinks back into it. */
export function ColonyDetailSheet({ colony, ev, ageMin, stale, origin, onClose, onPatrol, onDeclare }: Props) {
  const controls = useDragControls()
  const h = healthOf(colony.glow)
  const color = h === 'healthy' ? 'var(--glow-cyan)' : h === 'weak' ? 'var(--glow-amber)' : 'var(--glow-red)'
  const at = `${origin.x}px ${origin.y}px`
  const glow = h === 'healthy' ? 'bright' : ev.rapid || h === 'dying' ? 'dimming fast' : 'dimming'
  const rhythm = ev.critical ? 'failing' : ev.rapid ? 'fast fading' : ev.watch ? 'slowing' : 'steady'
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-10 overflow-y-auto band-scroll"
      style={{
        top: 4 + 216 + 8,
        background: 'linear-gradient(180deg, rgba(14,34,48,0.99), rgba(4,18,31,0.99))',
        borderTop: '2px solid var(--warden-gold)',
        borderRadius: '30px 30px 0 0',
      }}
      initial={{ clipPath: `circle(0px at ${at})` }}
      animate={{ clipPath: `circle(720px at ${at})` }}
      exit={{ clipPath: `circle(0px at ${at})` }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('[data-nodrag]')) controls.start(e) }}
      onDragEnd={(_, i) => { if (i.offset.y > 70 || i.velocity.y > 500) onClose() }}
      data-testid="colony-sheet"
    >
      <div className="px-4 pb-2 pt-1">
        <button type="button" onClick={onClose} aria-label="Close" className="mx-auto grid w-full place-items-center" style={{ height: 24 }} data-nodrag>
          <span className="block h-1.5 w-14 rounded-full" style={{ background: 'var(--warden-gold)', opacity: 0.8 }} />
        </button>

        <div className="flex items-center gap-3">
          <div className="bob" style={{ filter: stale ? 'blur(1px)' : undefined }}><GlowDot health={h} size={64} flagged={ev.flagged} /></div>
          <div className="flex-1">
            <h3 className="t-hero" style={{ fontSize: 26 }}>{colony.name}</h3>
            <p className="t-body" style={{ color: 'var(--text-70)' }}>{colony.junction}</p>
          </div>
        </div>

        <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-0.5">
          <dt className="t-body" style={{ color: 'var(--text-70)' }}>Glow</dt>
          <dd className="t-body" style={{ color, fontSize: 17 }}>{glow}</dd>
          <dt className="t-body" style={{ color: 'var(--text-70)' }}>Rhythm</dt>
          <dd className="t-body" style={{ color, fontSize: 17 }}>{rhythm}</dd>
          <dt className="t-body" style={{ color: 'var(--text-70)' }}>Current</dt>
          <dd className="t-body" style={{ fontSize: 17 }}>{colony.current === 'calm' ? 'calm' : 'restless'}</dd>
        </dl>
        {stale && (
          <p className="t-micro mt-1" style={{ color: 'var(--glow-amber)' }}>old news · last heard {ageMin} min ago</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2" data-nodrag>
          <button
            type="button"
            onClick={onPatrol}
            className="t-body rounded-full"
            style={{ height: 72, fontSize: 18, border: '2.5px solid var(--warden-gold)', background: 'rgba(255,233,168,0.14)', color: 'var(--warden-gold)' }}
          >
            PATROL
          </button>
          <PressureButton
            shape="pill" width={156} height={72}
            tone={ev.dangerReady ? 'declare' : 'muted'}
            label="DANGER"
            sub={ev.dangerReady ? 'hold' : 'needs an eye'}
            ariaLabel={ev.dangerReady ? 'Declare district danger. Press and hold for one second.' : 'Declare danger is locked until a Thalassari reports this colony or it goes red.'}
            onComplete={onDeclare}
          />
        </div>
      </div>
    </motion.div>
  )
}
