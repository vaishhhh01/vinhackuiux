import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { GlowDot } from '../components/GlowDot'
import { PressureButton } from '../components/PressureButton'
import { ReportChooser } from '../components/ReportChooser'
import { citizenById, useStore } from '../state/store'

/**
 * Where you are, and one job: press and hold REPORT THEFT.
 * Thalassari are not shown a colony's health. That is the Warden's reading to make; showing it
 * to everyone breeds rumour, and a theft is a theft however bright the colony is.
 */
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
  const saved = reportId && last?.id === reportId && last.phase === 'saved'

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

      <div className="mt-3 flex flex-col items-center gap-1">
        <div className="bob"><GlowDot health="healthy" size={132} still /></div>
        <p className="t-hero" style={{ fontSize: 22 }}>Level 1 · {colony.junction}</p>
        <p className="t-body" style={{ color: 'var(--text-70)', fontSize: 16 }}>you are here</p>
      </div>

      <div className="mt-3 min-h-[150px]">
        <AnimatePresence mode="wait">
          {chooser && reportId ? (
            <ReportChooser
              key="chooser"
              nearest={nearest}
              onPick={(id) => setDestination(reportId, id)}
              onDone={onClose}
            />
          ) : (
            <motion.p
              key="hint"
              exit={{ opacity: 0 }}
              className="t-body rounded-[26px] px-5 py-4 text-center"
              style={{ background: 'rgba(44,95,113,0.28)', border: '1px solid rgba(91,141,137,0.5)', fontSize: 16 }}
            >
              Saw someone taking Ilyri? Press and hold the button below
            </motion.p>
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
