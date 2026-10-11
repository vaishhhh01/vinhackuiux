import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BandShell } from '../components/BandShell'
import { LayerMap } from '../components/LayerMap'
import { CaseCard } from '../components/CaseCard'
import { ReportCard } from '../components/ReportCard'
import { ColonyDetailSheet } from '../components/ColonyDetailSheet'
import { BroadcastPad } from '../components/BroadcastPad'
import { DetailPopup } from '../components/DetailPopup'
import { GlowDot } from '../components/GlowDot'
import { PressureButton } from '../components/PressureButton'
import { Tideprint } from '../components/Tideprint'
import { px, py } from '../components/LightMap'
import { dangerCandidate, sortCases, type ColonyEval } from '../logic/escalation'
import { STALE_AFTER_MIN, healthOf } from '../logic/thresholds'
import { citizenById, useEvals, useStore, type Colony } from '../state/store'
import { minutesAgo, useLostAge, useNow } from '../hooks/useNow'

type Popup = { kind: 'case' | 'eye'; id: string } | null

const EyeIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size * 0.66} viewBox="0 0 24 16" aria-hidden="true">
    <path d="M1 8 Q12 -2 23 8 Q12 18 1 8 Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="12" cy="8" r="3.6" fill="currentColor" />
  </svg>
)

/** Guard Band: the water, two doors (Cases, Eyes), and one pad that calls danger. */
export function WardenDashboard() {
  const colonies = useStore((s) => s.colonies)
  const reports = useStore((s) => s.reports)
  const selectedId = useStore((s) => s.selectedColonyId)
  const highlightId = useStore((s) => s.highlightColonyId)
  const patrol = useStore((s) => s.patrol)
  const link = useStore((s) => s.link)
  const alert = useStore((s) => s.alert)
  const dangerId = useStore((s) => s.dangerColonyId)
  const source = useStore((s) => s.dangerSource)
  const select = useStore((s) => s.select)
  const setCaseStatus = useStore((s) => s.setCaseStatus)
  const handleReport = useStore((s) => s.handleReport)
  const startPatrol = useStore((s) => s.startPatrol)
  const clearPatrol = useStore((s) => s.clearPatrol)
  const declare = useStore((s) => s.declareDanger)
  const evals = useEvals()
  const lostAge = useLostAge()
  const now = useNow(15000)
  const scroller = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<Popup>(null)
  const [tab, setTab] = useState<'cases' | 'eyes'>('cases')

  // Cases are what the sensors flagged. Reports from Thalassari live only under Eyes.
  const cases = useMemo(
    () =>
      sortCases(
        evals
          .filter((e) => e.flagged)
          .map((e) => ({ ...e, witnesses: 0, escalated: false, chip: e.critical ? ('CRITICAL' as const) : ('WATCH' as const) })),
      ),
    [evals],
  )
  const candidate = useMemo(() => dangerCandidate(evals), [evals])
  const open = useMemo(() => reports.filter((r) => !r.handled).sort((a, b) => b.at - a.at), [reports])
  const witnesses = useMemo(() => {
    const m: Record<string, number> = {}
    open.forEach((r) => { m[r.colonyId] = (m[r.colonyId] ?? 0) + 1 })
    return m
  }, [open])
  const colonyOf = (id: string) => colonies.find((c) => c.id === id)
  const selColony = colonyOf(selectedId ?? '')
  const selEval = evals.find((e) => e.id === selectedId)
  const dangerColony = colonyOf(dangerId ?? '')
  const inDanger = alert === 'danger'
  const age = selColony ? selColony.baseAge + (lostAge ?? 0) : 0

  const popCase = popup?.kind === 'case' ? colonyOf(popup.id) : undefined
  const popCaseEval = popup?.kind === 'case' ? evals.find((e) => e.id === popup.id) : undefined
  const popEye = popup?.kind === 'eye' ? reports.find((r) => r.id === popup.id) : undefined

  return (
    <BandShell mode="warden">
      <div className="flex h-full flex-col">
        <AnimatePresence initial={false}>
          {inDanger ? (
            <motion.div
              key="danger"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 52, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mx-4 mb-1 flex items-center justify-center gap-3 overflow-hidden rounded-[26px] bloom-md"
              style={{ ['--c' as string]: 'var(--glow-red)', background: 'rgba(255,90,90,0.22)', border: '2px solid var(--glow-red)' }}
              role="status"
              data-testid="warden-danger-banner"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L22 20.5H2z" fill="var(--glow-red)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              <span className="t-hero" style={{ fontSize: 18 }}>
                {dangerColony?.junction ?? 'District'} · {source === 'sensor' ? 'lights failing' : 'danger'}
              </span>
            </motion.div>
          ) : (
            <motion.h2
              key="title" initial={false} exit={{ height: 0, opacity: 0 }}
              className="t-header px-4 text-center" style={{ color: 'var(--warden-gold)', height: 28, lineHeight: '26px' }}
            >
              WARDEN · LAYER 1
            </motion.h2>
          )}
        </AnimatePresence>

        <div className="relative min-h-0 flex-1">
          {/* HOME: the water, then Cases and Eyes listed right below it */}
          <div ref={scroller} className="band-scroll h-full overflow-y-auto px-4 pb-3 pt-1" data-testid="warden-scroll">
            <LayerMap
              colonies={colonies} evals={evals} selectedId={selectedId} highlightId={highlightId}
              patrol={patrol} link={link} lostAge={lostAge}
              dangerId={inDanger ? dangerId : null} witnesses={witnesses}
              onSelect={(id) => { scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }); select(selectedId === id ? null : id) }}
              onBackground={() => select(null)}
            />

            <AnimatePresence>
              {patrol && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 68 }} exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center justify-between overflow-hidden rounded-full px-5"
                  style={{ border: '2px solid var(--warden-gold)', background: 'rgba(255,233,168,0.1)' }}
                  data-testid="patrol-bar"
                >
                  <span className="t-body" style={{ color: 'var(--warden-gold)', fontSize: 17 }}>
                    PATROL · {patrol.order.length} stops · {patrol.minutes} min
                  </span>
                  <button type="button" onClick={clearPatrol} className="t-body rounded-full px-4" style={{ height: 64, minWidth: 64 }}>END</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Cases or eyes">
              <button
                type="button" role="tab" aria-selected={tab === 'cases'} onClick={() => setTab('cases')} data-testid="open-cases"
                aria-label={`Cases, ${cases.length}`}
                className="flex items-center justify-center gap-2"
                style={{
                  height: 68, borderRadius: '30px 20px 30px 20px',
                  background: tab === 'cases' ? 'rgba(255,233,168,0.16)' : 'rgba(255,255,255,0.04)',
                  border: tab === 'cases' ? '2.5px solid var(--warden-gold)' : '1.5px solid rgba(98,139,123,0.55)',
                  color: tab === 'cases' ? 'var(--warden-gold)' : 'var(--text)',
                }}
              >
                <GlowDot health={cases.some((c) => c.health === 'dying') ? 'dying' : cases.length ? 'weak' : 'healthy'} size={34} still />
                <span className="t-hero" style={{ fontSize: 20 }}>Cases</span>
                <Count n={cases.length} />
              </button>
              <button
                type="button" role="tab" aria-selected={tab === 'eyes'} onClick={() => setTab('eyes')} data-testid="open-eyes"
                aria-label={`Eyes, ${open.length}`}
                className="flex items-center justify-center gap-2"
                style={{
                  height: 68, borderRadius: '20px 30px 20px 30px',
                  background: tab === 'eyes' ? 'rgba(255,233,168,0.16)' : 'rgba(255,255,255,0.04)',
                  border: tab === 'eyes' ? '2.5px solid var(--warden-gold)' : '1.5px solid rgba(98,139,123,0.55)',
                  color: tab === 'eyes' ? 'var(--warden-gold)' : 'var(--text)',
                }}
              >
                <EyeIcon size={32} />
                <span className="t-hero" style={{ fontSize: 20 }}>Eyes</span>
                <Count n={open.length} />
              </button>
            </div>

            {/* the list is already there, below the buttons */}
            {tab === 'cases' ? (
              <div className="mt-2">
                {cases.length === 0 && <Empty text="all lights are calm" />}
                <ul className="flex flex-col gap-2" data-testid="cases-list">
                  <AnimatePresence initial={false}>
                    {cases.map((e) => (
                      <CaseCard
                        key={e.id} colony={colonyOf(e.id)!} ev={e}
                        onOpen={() => setPopup({ kind: 'case', id: e.id })}
                        onHandled={() => setCaseStatus(e.id, 'protected')}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ) : (
              <div className="mt-2">
                {open.length === 0 && <Empty text="nobody has reported" />}
                <ul data-testid="eyes-list">
                  <AnimatePresence initial={false}>
                    {open.map((r) => (
                      <ReportCard
                        key={r.id} report={r} now={now}
                        destination={colonyOf(r.destinationId ?? '')}
                        onOpen={() => setPopup({ kind: 'eye', id: r.id })}
                        onHandled={() => handleReport(r.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )}
          </div>

          {/* map-tap sheet (a colony straight from the water) */}
          <AnimatePresence>
            {selColony && selEval && (
              <ColonyDetailSheet
                key={selColony.id}
                colony={selColony}
                ev={selEval}
                ageMin={age}
                stale={age >= STALE_AFTER_MIN}
                origin={{ x: 16 + px(selColony.x), y: 4 + py(selColony.y) - (4 + 216 + 8) }}
                onClose={() => select(null)}
                onPatrol={() => startPatrol(selColony.id)}
                onDeclare={() => declare(selColony.id)}
              />
            )}
          </AnimatePresence>

          {/* pop-ups */}
          <AnimatePresence>
            {popCase && popCaseEval && (
              <DetailPopup key={`c-${popCase.id}`} label={`${popCase.junction} details`} onClose={() => setPopup(null)}>
                <CaseDetail
                  colony={popCase} ev={popCaseEval}
                  onPatrol={() => { startPatrol(popCase.id); setPopup(null) }}
                  onDeclare={() => { declare(popCase.id); setPopup(null) }}
                />
              </DetailPopup>
            )}
            {popEye && (
              <DetailPopup key={`e-${popEye.id}`} label="Who reported" onClose={() => setPopup(null)}>
                <EyeDetail
                  report={popEye} now={now}
                  seenAt={colonyOf(popEye.colonyId)}
                  heading={colonyOf(popEye.destinationId ?? '')}
                  onPatrol={() => { startPatrol(popEye.colonyId); setPopup(null) }}
                  onDeclare={() => { declare(popEye.colonyId); setPopup(null) }}
                  onHandled={() => { handleReport(popEye.id); setPopup(null) }}
                />
              </DetailPopup>
            )}
          </AnimatePresence>
        </div>

        {(!selColony || inDanger) && (
          <div className="flex justify-center px-4 pb-1 pt-1.5" style={{ borderTop: '1.5px solid rgba(255,233,168,0.2)' }}>
            <BroadcastPad candidate={candidate} />
          </div>
        )}
      </div>
    </BandShell>
  )
}

function Count({ n }: { n: number }) {
  return (
    <span
      className="t-body grid place-items-center rounded-full px-2"
      style={{ minWidth: 30, height: 28, background: n ? 'var(--glow-red)' : 'rgba(228,246,243,0.15)', color: n ? 'var(--abyss)' : 'var(--text)', fontSize: 15 }}
    >
      {n}
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="t-body rounded-[28px] py-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-70)', fontSize: 17 }}>
      {text}
    </p>
  )
}

function CaseDetail({
  colony, ev, onPatrol, onDeclare,
}: { colony: Colony; ev: ColonyEval; onPatrol: () => void; onDeclare: () => void }) {
  const h = healthOf(colony.glow)
  const color = h === 'healthy' ? 'var(--glow-cyan)' : h === 'weak' ? 'var(--glow-amber)' : 'var(--glow-red)'
  const glow = h === 'healthy' ? 'bright' : ev.rapid || h === 'dying' ? 'dimming fast' : 'dimming'
  const rhythm = ev.critical ? 'failing' : ev.rapid ? 'fast fading' : ev.watch ? 'slowing' : 'steady'
  return (
    <div data-testid="case-detail">
      <div className="flex items-center gap-3 pr-14">
        <span className="bob"><GlowDot health={h} size={72} flagged={ev.flagged} /></span>
        <div className="min-w-0">
          <h3 className="t-hero truncate" style={{ fontSize: 26 }}>{colony.junction}</h3>
          <p className="t-body truncate" style={{ color: 'var(--text-70)', fontSize: 17 }}>{colony.name}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1">
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>Glow</dt>
        <dd className="t-body" style={{ color, fontSize: 18 }}>{glow}</dd>
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>Rhythm</dt>
        <dd className="t-body" style={{ color, fontSize: 18 }}>{rhythm}</dd>
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>Current</dt>
        <dd className="t-body" style={{ fontSize: 18 }}>{colony.current === 'calm' ? 'calm' : 'restless'}</dd>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button" onClick={onPatrol} className="t-body rounded-full"
          style={{ height: 72, fontSize: 18, border: '2.5px solid var(--warden-gold)', background: 'rgba(255,233,168,0.14)', color: 'var(--warden-gold)' }}
        >
          PATROL
        </button>
        <PressureButton
          shape="pill" width={150} height={72}
          tone={ev.dangerReady ? 'declare' : 'muted'}
          label="DANGER" sub={ev.dangerReady ? 'hold' : 'needs an eye'}
          ariaLabel={ev.dangerReady ? 'Declare district danger. Press and hold for one second.' : 'Declare danger is locked until a Thalassari reports this colony or it goes red.'}
          onComplete={onDeclare}
        />
      </div>
    </div>
  )
}

function EyeDetail({
  report, now, seenAt, heading, onPatrol, onDeclare, onHandled,
}: { report: { tideprint: number; citizenId: string; at: number }; now: number; seenAt?: Colony; heading?: Colony; onPatrol: () => void; onDeclare: () => void; onHandled: () => void }) {
  const who = citizenById(report.citizenId)
  return (
    <div data-testid="eye-detail">
      <div className="flex flex-col items-center pt-1">
        <span className="bob"><Tideprint seed={report.tideprint} size={96} /></span>
        <p className="t-hero mt-1" style={{ fontSize: 26, letterSpacing: '0.06em', color: 'var(--living-light)' }}>{who.tideprintId}</p>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1.5">
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>Saw it at</dt>
        <dd className="t-body" style={{ fontSize: 18 }}>{seenAt ? `${seenAt.name} · ${seenAt.junction}` : 'nil'}</dd>
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>Thief heading to</dt>
        <dd className="t-body" style={{ fontSize: 18, color: heading ? 'var(--glow-amber)' : 'var(--text-70)' }} data-testid="eye-heading">{heading ? heading.name : 'nil'}</dd>
        <dt className="t-body" style={{ color: 'var(--text-70)' }}>When</dt>
        <dd className="t-body" style={{ fontSize: 18 }}>{minutesAgo(report.at, now)}</dd>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button" onClick={onPatrol} className="t-body rounded-full"
          style={{ height: 72, fontSize: 18, border: '2.5px solid var(--warden-gold)', background: 'rgba(255,233,168,0.14)', color: 'var(--warden-gold)' }}
        >
          PATROL
        </button>
        <PressureButton
          shape="pill" width={150} height={72} tone="declare"
          label="DANGER" sub="hold"
          ariaLabel="Declare district danger from this eye. Press and hold for one second."
          onComplete={onDeclare}
        />
      </div>
      <button
        type="button" onClick={onHandled} className="t-body mt-2 w-full rounded-full"
        style={{ height: 64, fontSize: 17, border: '1.5px solid rgba(255,233,168,0.5)', background: 'transparent', color: 'var(--text)' }}
      >
        HANDLED
      </button>
    </div>
  )
}
