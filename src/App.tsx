import { useEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { CitizenBand } from './screens/CitizenBand'
import { WardenDashboard } from './screens/WardenDashboard'
import { CurrentControls, PulseLegend, SimulatorPanel } from './components/SimulatorPanel'
import { IntroCard } from './components/IntroCard'
import { GlowDot } from './components/GlowDot'
import { Tideprint } from './components/Tideprint'
import { CITIZENS, citizenById, useStore } from './state/store'

function Announcer() {
  const a = useStore((s) => s.announce)
  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{!a.assertive ? a.text : ''}</div>
      <div role="alert" aria-live="assertive" className="sr-only">{a.assertive ? a.text : ''}</div>
    </>
  )
}

/**
 * First visit. Everything is covered in a translucent gray veil except the About button, and a
 * pulsing ring asks the visitor to click there. The veil lifts once
 * About has been opened and closed. The About button itself pulses to say "press me".
 */
function FirstVisitGuide({ target, onOpen }: { target: RefObject<HTMLDivElement>; onOpen: () => void }) {
  const [r, setR] = useState<DOMRect | null>(null)
  useEffect(() => {
    const measure = () => setR(target.current?.getBoundingClientRect() ?? null)
    measure()
    const t = setInterval(measure, 250)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [target])
  if (!r) return null
  const pad = 6
  const hole = { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad }
  const W = window.innerWidth
  const H = window.innerHeight
  const rad = 30
  const x0 = hole.l, y0 = hole.t, x1 = hole.r, y1 = hole.b
  // one veil with a rounded cut-out, so the button sits in a soft window instead of a square one
  const d = `M0 0H${W}V${H}H0Z M${x0 + rad} ${y0}H${x1 - rad}A${rad} ${rad} 0 0 1 ${x1} ${y0 + rad}V${y1 - rad}A${rad} ${rad} 0 0 1 ${x1 - rad} ${y1}H${x0 + rad}A${rad} ${rad} 0 0 1 ${x0} ${y1 - rad}V${y0 + rad}A${rad} ${rad} 0 0 1 ${x0 + rad} ${y0}Z`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><path fill-rule='evenodd' d='${d}'/></svg>`
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  return (
    <div data-testid="first-visit-guide">
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(150,156,162,0.55)',
          backdropFilter: 'grayscale(1) blur(2px)', WebkitBackdropFilter: 'grayscale(1) blur(2px)',
          WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
        }}
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open About"
        className="about-pulse fixed rounded-[30px]"
        style={{ zIndex: 56, left: hole.l, top: hole.t, width: hole.r - hole.l, height: hole.b - hole.t, cursor: 'pointer' }}
      />
    </div>
  )
}

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

/** The LUMEN name sits on top of each phone, big and readable, with the band's role in a pill. */
function Wordmark({ sub, gold }: { sub: string; gold?: boolean }) {
  const c = gold ? 'var(--warden-gold)' : 'var(--living-light)'
  return (
    <div className="flex items-center gap-3">
      <span className="bob"><GlowDot health="healthy" size={54} /></span>
      <div className="flex flex-col items-start gap-1.5">
        <div className="t-brand" style={{ fontSize: 58, lineHeight: 0.85, color: c, textShadow: `0 0 24px color-mix(in srgb, ${c} 45%, transparent)` }}>
          Lumen
        </div>
        <span
          className="t-body rounded-full px-3"
          style={{ fontSize: 14, lineHeight: '24px', color: c, border: `1.5px solid ${c}`, background: `color-mix(in srgb, ${c} 12%, transparent)` }}
        >
          {sub}
        </span>
      </div>
    </div>
  )
}

/** Fixed 360x640 band scaled to fit; drag maths are corrected for the scale. */
function Scaled({ s, children }: { s: number; children: React.ReactNode }) {
  return (
    <div style={{ width: 360 * s, height: 640 * s }}>
      <MotionConfig transformPagePoint={(p) => ({ x: p.x / s, y: p.y / s })}>
        <div style={{ width: 360, height: 640, transform: `scale(${s})`, transformOrigin: 'top left' }}>{children}</div>
      </MotionConfig>
    </div>
  )
}

function SideButton({ active, onClick, label, children, tone }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode; tone: 'cyan' | 'gold' | 'plain' }) {
  const c = tone === 'gold' ? 'var(--warden-gold)' : tone === 'cyan' ? 'var(--glow-cyan)' : 'var(--text)'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full flex-col items-center justify-center gap-1 rounded-[26px]"
      style={{
        height: 86,
        background: active ? `color-mix(in srgb, ${c} 18%, transparent)` : 'rgba(255,255,255,0.04)',
        border: `2.5px solid ${active ? c : 'rgba(228,246,243,0.18)'}`,
        boxShadow: active ? `0 0 24px color-mix(in srgb, ${c} 40%, transparent)` : undefined,
        color: active ? c : 'var(--text)',
      }}
    >
      {children}
      <span className="t-body" style={{ fontSize: 14 }}>{label}</span>
    </button>
  )
}

export default function App() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const sideBySide = useStore((s) => s.sideBySide)
  const setSideBySide = useStore((s) => s.setSideBySide)
  const hydrate = useStore((s) => s.hydrateQueue)
  const setLink = useStore((s) => s.setLink)
  const me = citizenById(useStore((s) => s.citizenId))
  const setCitizen = useStore((s) => s.setCitizen)
  const { w, h } = useViewport()
  const [about, setAbout] = useState(false)
  // every time the site opens (or is refreshed): About comes first, the rest is veiled until it has been read
  const [seenAbout, setSeenAbout] = useState(false)
  const aboutRef = useRef<HTMLDivElement>(null)
  // About grows out of the About button and folds back into the page
  const [aboutFrom, setAboutFrom] = useState({ x: 0, y: 0 })
  const openAbout = () => {
    const r = aboutRef.current?.getBoundingClientRect()
    if (r) setAboutFrom({ x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - 260 })
    setAbout(true)
  }
  const closeAbout = () => {
    setAbout(false)
    setSeenAbout(true)
  }
  const [sheet, setSheet] = useState(false)

  const desktop = w >= 1100
  const phone = w <= 480
  const dual = sideBySide && w >= 860

  useEffect(() => {
    void hydrate()
    const off = () => setLink('lost')
    const on = () => setLink('connected')
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    if (!navigator.onLine) off()
    return () => {
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [])

  const n = dual ? 2 : 1
  const stageW = desktop ? w - 232 - 320 - 72 : w - (phone ? 0 : 24)
  const byW = stageW / (n * 360 + (n - 1) * 40)
  const byH = (h - (desktop ? 150 : phone ? 190 : 250)) / 640
  const scale = Math.max(0.5, Math.min(phone ? 1.6 : 1.15, byW, byH))

  const showUsers = dual || mode === 'citizen'

  const left = (
    <aside
      aria-label="Controls"
      className={desktop ? 'sticky top-4 flex max-h-[calc(100vh-32px)] w-[212px] shrink-0 flex-col gap-4 overflow-y-auto band-scroll' : 'flex w-full max-w-[420px] flex-col gap-4'}
    >
      <nav aria-label="Switch band" className="grid grid-cols-2 gap-2">
        <SideButton tone="cyan" active={!dual && mode === 'citizen'} label="Thalassari" onClick={() => { setSideBySide(false); setMode('citizen') }}>
          <Tideprint seed={me.seed} size={36} glow={false} />
        </SideButton>
        <SideButton tone="gold" active={!dual && mode === 'warden'} label="Warden" onClick={() => { setSideBySide(false); setMode('warden') }}>
          <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 6 L58 38 L94 50 L58 62 L50 94 L42 62 L6 50 L42 38 Z" fill="rgba(255,233,168,0.3)" stroke="var(--warden-gold)" strokeWidth="6" strokeLinejoin="round" />
          </svg>
        </SideButton>
        {w >= 860 ? (
          <SideButton tone="plain" active={dual} label="Both" onClick={() => setSideBySide(!sideBySide)}>
            <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="34" cy="50" r="24" fill="none" stroke="var(--glow-cyan)" strokeWidth="7" />
              <circle cx="66" cy="50" r="24" fill="none" stroke="var(--warden-gold)" strokeWidth="7" />
            </svg>
          </SideButton>
        ) : <span />}
        <div ref={aboutRef} data-testid={seenAbout ? undefined : 'start-here'}>
          <SideButton tone={seenAbout ? 'plain' : 'gold'} active={!seenAbout} label={seenAbout ? 'About' : 'Start here'} onClick={openAbout}>
            <span className="t-hero" style={{ fontSize: 30, lineHeight: '36px' }} aria-hidden="true">?</span>
          </SideButton>
        </div>
      </nav>

      {showUsers && (
        <section aria-label="Who is wearing the band">
          <h3 className="t-header mb-1.5" style={{ color: 'var(--text-70)', fontSize: 12, letterSpacing: '0.18em' }}>WEARING</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {CITIZENS.map((c) => {
              const on = c.id === me.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${c.name}, ${c.tideprintId}`}
                  onClick={() => setCitizen(c.id)}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-[20px]"
                  style={{
                    height: 76,
                    background: on ? 'rgba(77,232,210,0.2)' : 'rgba(255,255,255,0.04)',
                    border: on ? '2.5px solid var(--glow-cyan)' : '1.5px solid rgba(228,246,243,0.16)',
                    boxShadow: on ? '0 0 18px rgba(77,232,210,0.35)' : undefined,
                  }}
                >
                  <Tideprint seed={c.seed} size={38} glow={on} />
                  <span className="t-body" style={{ fontSize: 12 }}>{c.name}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <PulseLegend />
      <CurrentControls />
    </aside>
  )

  return (
    <div className="relative min-h-full" style={{ background: '#000' }}>
      <Announcer />

      <main className={`relative z-10 ${desktop ? 'flex items-start justify-center gap-8 px-5 py-4' : 'flex flex-col items-center gap-5 px-3 py-4'}`}>
        {left}

        <div id="stage" className="flex justify-center gap-10" tabIndex={-1}>
          {(dual || mode === 'citizen') && (
            <section aria-label="Thalassari band" className="flex flex-col items-start gap-3">
              <Wordmark sub="Thalassari band" />
              <Scaled s={scale}><CitizenBand /></Scaled>
            </section>
          )}
          {(dual || mode === 'warden') && (
            <section aria-label="Warden band" className="flex flex-col items-start gap-3">
              <Wordmark sub="Warden band" gold />
              <Scaled s={scale}><WardenDashboard /></Scaled>
            </section>
          )}
        </div>

        {desktop && (
          <aside
            aria-label="Simulation"
            className="sticky top-4 max-h-[calc(100vh-32px)] w-[300px] shrink-0 overflow-y-auto rounded-[32px] p-4 band-scroll"
            style={{ background: 'rgba(255,233,168,0.05)', border: '2px solid rgba(255,233,168,0.45)', boxShadow: '0 0 40px rgba(255,233,168,0.12)' }}
          >
            <SimulatorPanel />
          </aside>
        )}
      </main>

      {!desktop && (
        <button
          type="button"
          onClick={() => setSheet((s) => !s)}
          aria-expanded={sheet}
          className="t-header fixed bottom-4 right-4 z-40 rounded-full px-5"
          style={{
            height: 56, fontSize: 15, letterSpacing: '0.16em', color: 'var(--abyss)',
            background: 'var(--warden-gold)', boxShadow: '0 0 28px rgba(255,233,168,0.5)',
          }}
        >
          SIMULATION
        </button>
      )}

      {!desktop && sheet && (
        <div
          role="dialog"
          aria-label="Simulation"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-[32px] p-4"
          style={{ background: '#050b12', borderTop: '2px solid var(--warden-gold)', boxShadow: '0 -20px 60px rgba(0,0,0,0.7)' }}
        >
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={() => setSheet(false)} className="t-body rounded-full px-5" style={{ height: 48, border: '1.5px solid rgba(228,246,243,0.3)' }}>
              Close
            </button>
          </div>
          <SimulatorPanel />
        </div>
      )}

      {/* first visit: the page greys out, only About stays clear, with a hand-written pointer */}
      {!seenAbout && !about && <FirstVisitGuide target={aboutRef} onOpen={openAbout} />}

      <AnimatePresence>
        {about && (
          <motion.div
            key="about"
            role="dialog"
            aria-modal="true"
            aria-label="About THALASSA"
            className="fixed inset-0 z-[60] grid place-items-start justify-items-center overflow-y-auto p-4"
            style={{ background: 'rgba(0,0,0,0.82)' }}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)', transition: { duration: 0.28 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeAbout() }}
          >
            <motion.div
              className="w-full max-w-[560px]"
              initial={{ opacity: 0, scale: 0.35, x: aboutFrom.x, y: aboutFrom.y, borderRadius: 60 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0, borderRadius: 28 }}
              exit={{ opacity: 0, scale: 0.5, x: aboutFrom.x, y: aboutFrom.y, transition: { duration: 0.3, ease: 'easeIn' } }}
              transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.9 }}
            >
              <IntroCard open onToggle={closeAbout} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
