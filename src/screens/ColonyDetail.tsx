import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { GlowDot, HEALTH_WORD } from '../components/GlowDot'
import { PressureButton } from '../components/PressureButton'
import { ReportChooser } from '../components/ReportChooser'
import { citizenById, useStore } from '../state/store'
import { healthOf } from '../logic/thresholds'

const Row = ({ icon, v, color }: { icon: React.ReactNode; v: string; color: string }) => (
  <div className="flex items-center gap-3 px-4" style={{ height: 48, borderRadius: '24px 16px 24px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(228,246,243,0.14)' }}>
    <span aria-hidden="true" className="grid h-8 w-8 place-items-center">{icon}</span>
    <span className="t-body" style={{ color, fontSize: 17 }}>{v}</span>
  </div>
)

/** Press a colony on the map, then press and hold REPORT THEFT. Words and shapes, no numbers. */
export function ColonyDetail({ colonyId, onClose }: { colonyId: string; onClose: () => void }) {
  const colony = useStore((s) => s.colonies.find((c) => c.id === colonyId))
  const colonies = useStore((s) => s.colonies)
  const me = citizenById(useStore((s) => s.citizenId))
  const submit = useStore((s) => s.submitReport)
  const setDestination = useStore((s) => s.setDestination)
  const last = useStore((s) => s.lastReport)
  const [reportId, setReportId] = useState<string | null>(null)
  const [chooser, setChooser] = useState(false)
  const controls = useDragControls()

  const nearest = useMemo(
    () =>
      [...colonies]
        .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))
        .slice(0, 3),
    [colonies, me.x, me.y],
  )

  useEffect(() => {
    if (!reportId) return
    const t = setTimeout(() => setChooser(true), 1000)
    return () => clearTimeout(t)
  }, [reportId])

  if (!colony) return null
  const h = healthOf(colony.glow)
  const color = h === 'healthy' ? 'var(--glow-cyan)' : h === 'weak' ? 'var(--glow-amber)' : 'var(--glow-red)'
  const saved = reportId && last?.id === reportId && last.phase === 'saved'
  const word = h === 'healthy' ? 'Calm' : h === 'weak' ? 'Fading' : 'Going dark'

  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col px-4 pb-2"
      style={{ background: 'linear-gradient(180deg, var(--abyss-2), var(--abyss))' }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('[data-nodrag]')) controls.start(e) }}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, i) => { if (i.offset.y > 90 || i.velocity.y > 600) onClose() }}
      data-testid="colony-detail"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the map"
          data-nodrag
          className="grid place-items-center rounded-full"
          style={{ width: 64, height: 64, border: '2px solid var(--glow-cyan)', background: 'rgba(77,232,210,0.1)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--glow-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h2 className="t-hero" style={{ fontSize: 26 }}>{colony.name}</h2>
      </div>

      <div className="mt-1 flex flex-col items-center">
        <div className="bob"><GlowDot health={h} size={118} /></div>
        <p className="t-hero" style={{ color, fontSize: 26 }}>{word}</p>
      </div>

      <div className="mt-2 min-h-[190px]">
        <AnimatePresence mode="wait">
          {chooser && reportId ? (
            <ReportChooser
              key="chooser"
              nearest={nearest}
              onPick={(id) => setDestination(reportId, id)}
              onDone={onClose}
            />
          ) : (
            <motion.div key="rows" className="flex flex-col gap-2" exit={{ opacity: 0 }}>
              <Row
                v={HEALTH_WORD[h]} color={color}
                icon={<GlowDot health={h} size={28} still />}
              />
              <Row
                v={h === 'healthy' ? 'light steady' : h === 'weak' ? 'light falling' : 'light failing · stay clear'} color={color}
                icon={<svg width="26" height="26" viewBox="0 0 24 24"><path d={h === 'healthy' ? 'M4 12h16' : h === 'weak' ? 'M4 7l16 10' : 'M4 5l16 14'} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" /></svg>}
              />
              <Row
                v={colony.current === 'calm' ? 'current calm' : 'current restless'}
                color={colony.current === 'calm' ? 'var(--glow-cyan)' : 'var(--glow-amber)'}
                icon={<svg width="28" height="16" viewBox="0 0 24 14"><path d={colony.current === 'calm' ? 'M1 7 Q6 2 12 7 T23 7' : 'M1 7 L5 2 L9 12 L13 2 L17 12 L23 7'} stroke={colony.current === 'calm' ? 'var(--glow-cyan)' : 'var(--glow-amber)'} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto flex justify-center pt-2" data-nodrag>
        <PressureButton
          shape="pill" width={328} height={80} tone="report"
          label="REPORT THEFT" holdLabel="keep holding" sub="press and hold"
          state={reportId ? (saved ? 'saved' : 'done') : 'idle'}
          doneLabel={saved ? 'REPORT SAVED' : 'REPORT SENT'}
          doneSub={saved ? 'sends when Current returns' : `Level 1 · ${colony.junction}`}
          ariaLabel={`Report theft at ${colony.name}. Press and hold for one second.`}
          autoReset={false}
          onComplete={() => setReportId(submit(colony.id))}
        />
      </div>
    </motion.div>
  )
}
