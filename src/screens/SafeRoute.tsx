import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CurrentLines, MAP_H, MAP_W, VB_H, px, py } from '../components/LightMap'
import { GlowDot } from '../components/GlowDot'
import { PressureButton } from '../components/PressureButton'
import { SafeRoutePath, type RoutePhase } from '../components/SafeRoutePath'
import { DANGER_RADIUS, citizenById, useStore } from '../state/store'
import layers from '../data/layers.json'
import { MARK_MAX_LAYER, firstViolation, naiveShortcut } from '../logic/routing'
import { buildDistrictGraph, chooseSafeTarget, type Waypoint } from '../logic/district'

const WAYPOINTS = (layers.graph.nodes as Waypoint[]).filter((n) => ['w-e', 'w-g', 's1', 's2'].includes(n.id))
const EXIT = layers.exit
/** after the two red pulses the map swells to fill the band */
const GROW = 1.5
const GROW_AFTER_MS = 2300

/** PANEL 3: the alert overrides every panel; only all-clear or a deliberate "I'm safe" hold closes it. */
export function SafeRoute() {
  const alert = useStore((s) => s.alert)
  const colonies = useStore((s) => s.colonies)
  const dangerId = useStore((s) => s.dangerColonyId)
  const source = useStore((s) => s.dangerSource)
  const mark = useStore((s) => s.depthMark)
  const me = citizenById(useStore((s) => s.citizenId))
  const demo = useStore((s) => s.routeDemoNonce)
  const blocked = useStore((s) => s.routeBlocked)
  const safeNow = useStore((s) => s.citizenSafeNow)
  // latch: while the panel animates out after an all-clear it must keep looking calm, not flash red
  const lastKind = useRef<'danger' | 'allClear'>('danger')
  if (alert === 'danger' || alert === 'allClear') lastKind.current = alert
  const clear = lastKind.current === 'allClear'

  const danger = colonies.find((c) => c.id === dangerId) ?? colonies[0]
  const max = MARK_MAX_LAYER[mark]

  const { safe, naive, violation, target } = useMemo(() => {
    // go to the NEAREST bright colony outside the dark zone; only if none is left, up a level
    const graph = buildDistrictGraph(colonies, me, WAYPOINTS, { ...EXIT, lit: true })
    const t = chooseSafeTarget(graph, colonies, { x: danger.x, y: danger.y, id: danger.id }, DANGER_RADIUS, mark)
    const n = t ? naiveShortcut(graph, 'you', t.id) : null
    return { safe: t?.route ?? null, naive: n, violation: n ? firstViolation(n, max) : -1, target: t }
  }, [danger.id, mark, max, me.x, me.y, colonies])

  const frame = useMemo(() => {
    const pts: { x: number; y: number }[] = [
      { x: me.x, y: me.y },
      { x: danger.x - DANGER_RADIUS, y: danger.y - DANGER_RADIUS },
      { x: danger.x + DANGER_RADIUS, y: danger.y + DANGER_RADIUS },
      ...(safe?.points ?? []),
    ]
    if (target && safe) {
      // keep the whole destination tag in view, not just its colony
      const dest = safe.points[safe.points.length - 1]
      const text = target.kind === 'level' ? target.label : `SAFE · ${target.label}`
      const half = Math.max(24, text.length * 2.15 + 6) / 2
      const below = dest.y > me.y // tag goes on the far side from the wearer so the two labels never sit on top of each other
      pts.push({ x: dest.x - half, y: below ? dest.y : dest.y - 13 }, { x: dest.x + half, y: below ? dest.y + 13 : dest.y + 4 })
    }
    const pad = 9 // map units of breathing room, so tags and the You label are never cut
    const x0 = Math.min(...pts.map((p) => p.x)) - pad
    const x1 = Math.max(...pts.map((p) => p.x)) + pad
    const y0 = Math.min(...pts.map((p) => p.y)) - pad
    const y1 = Math.max(...pts.map((p) => p.y)) + pad
    const bx = px(x0), bw = px(x1) - px(x0), by = py(y0), bh = py(y1) - py(y0)
    const W = MAP_W, H = MAP_H * GROW
    const s = Math.max(1, Math.min(2.1, W / bw, H / bh))
    return { s, x: W / 2 - s * (bx + bw / 2), y: H / 2 - s * (by + bh / 2) }
  }, [me.x, me.y, danger.x, danger.y, safe, target])

  const [phase, setPhase] = useState<RoutePhase>('safe')
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), GROW_AFTER_MS)
    return () => clearTimeout(t)
  }, [])
  const [rerouted, setRerouted] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!demo) return
    timers.current.forEach(clearTimeout)
    if (violation < 1) {
      setPhase('safe')
      return
    }
    setRerouted(false)
    setPhase('shortcut')
    timers.current = [
      setTimeout(() => setPhase('blocked'), 1700),
      setTimeout(() => { setPhase('reroute'); setRerouted(true) }, 3000),
      setTimeout(() => setPhase('safe'), 4800),
    ]
    return () => timers.current.forEach(clearTimeout)
  }, [demo])

  useEffect(() => { if (!demo) setRerouted(false) }, [mark, danger.id])

  const noRoute = blocked || !safe
  const lit = colonies // neutral lights: the route, not a colony's health, is what a wearer needs
  const dark = DANGER_RADIUS * (MAP_W / 100)
  const sub = source === 'sensor' ? `Lights failing near ${danger.junction}` : `Warden declared ${danger.junction} unsafe`

  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col px-4 pb-1"
      style={{ background: 'linear-gradient(180deg, #10121f 0%, var(--abyss) 60%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="alert-panel"
      data-nodrag
    >
      {/* banner */}
      <div
        className={`mt-1 flex items-center gap-3 rounded-3xl px-4 ${clear ? 'bloom-lg' : 'bloom-lg pulse-double'}`}
        style={{
          ['--c' as string]: clear ? 'var(--calm-blue)' : 'var(--glow-red)',
          minHeight: 60,
          background: clear
            ? 'radial-gradient(120% 200% at 20% 50%, rgba(111,182,255,0.55), rgba(20,50,90,0.6))'
            : 'radial-gradient(120% 200% at 20% 50%, rgba(255,90,90,0.65), rgba(90,10,20,0.7))',
          border: `2px solid ${clear ? 'var(--calm-blue)' : 'var(--glow-red)'}`,
        }}
        role="alert"
      >
        {clear ? (
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--calm-blue)" strokeWidth="2.4" /><path d="M7 12.5l3.5 3.5L17 9" fill="none" stroke="var(--calm-blue)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L22 20.5H2z" fill="var(--glow-red)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 9.5v5M12 17v.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
        )}
        <div className="leading-tight">
          <div className="t-hero" style={{ letterSpacing: '0.1em' }}>{clear ? 'ALL CLEAR' : 'DISTRICT DANGER'}</div>
          <div className="t-micro" style={{ color: 'var(--text)' }}>{clear ? 'district is safe · returning home' : sub}</div>
        </div>
      </div>

      {/* map */}
      <motion.div
        className="relative mt-2 overflow-hidden rounded-3xl"
        style={{ width: MAP_W, background: 'radial-gradient(90% 90% at 50% 50%, #12263a, #07131f)', border: '1px solid rgba(255,90,90,0.35)' }}
        initial={false}
        animate={{ height: grown ? MAP_H * GROW : MAP_H }}
        transition={{ duration: 1.4, ease: [0.22, 0.8, 0.3, 1] }}
        data-testid="route-map"
        data-grown={grown}
      >
        <motion.div
          style={{ width: MAP_W, height: MAP_H, transformOrigin: '0 0', position: 'relative' }}
          initial={false}
          animate={grown ? { scale: frame.s, x: frame.x, y: frame.y } : { scale: 1, x: 0, y: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 0.8, 0.3, 1] }}
        >
        <svg viewBox={`0 0 100 ${VB_H}`} width={MAP_W} height={MAP_H} className="absolute inset-0" role="img" aria-label="Safe route map">
          <defs>
            <radialGradient id="dz">
              <stop offset="0" stopColor="#ff5a5a" stopOpacity="0.55" />
              <stop offset="0.7" stopColor="#ff5a5a" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ff5a5a" stopOpacity="0.05" />
            </radialGradient>
          </defs>
          <CurrentLines opacity={0.18} />
          <circle cx={danger.x} cy={danger.y} r={DANGER_RADIUS} fill="url(#dz)" stroke="var(--glow-red)" strokeWidth="0.7" strokeDasharray="1.6 1.6" className="pulse-slow" />
          {/* destination: the nearest safe colony, or (rare) the next level */}
          {target && !noRoute && (() => {
            const dest = target.route.points[target.route.points.length - 1]
            const text = target.kind === 'level' ? target.label : `SAFE · ${target.label}`
            const w = Math.max(24, text.length * 2.15 + 6)
            return (
              <g transform={`translate(${dest.x} ${dest.y > me.y ? dest.y + 8 : dest.y - 7})`}>
                <rect x={-w / 2} y="-4.4" width={w} height="8.8" rx="4.4" fill="rgba(77,232,210,0.16)" stroke="var(--glow-cyan)" strokeWidth="0.8" />
                <text textAnchor="middle" y="1.2" fontSize="3.3" fontWeight="800" fill="var(--text)">{text}</text>
              </g>
            )
          })()}
          {!noRoute && <SafeRoutePath safe={safe} naive={naive} violation={violation} phase={phase} mark={max} />}
          {phase === 'blocked' && !noRoute && (
            <text x="50" y="62" textAnchor="middle" fontSize="4" fontWeight="800" fill="var(--glow-amber)">too deep</text>
          )}
        </svg>
        {lit.map((c) => (
          <span key={c.id} className="absolute" style={{ left: px(c.x) - 11, top: py(c.y) - 11 }} aria-hidden="true">
            <GlowDot health="healthy" size={22} still />
            <span className="absolute left-1/2 whitespace-nowrap rounded-full px-1" style={{ top: 22, transform: 'translateX(-50%)', background: 'rgba(4,18,31,0.7)', color: 'var(--text)', fontSize: 9, fontWeight: 800, lineHeight: '12px' }}>
              {c.name}
            </span>
          </span>
        ))}
        {/* you */}
        <span className="absolute grid place-items-center" style={{ left: px(me.x) - 12, top: py(me.y) - 12, width: 24, height: 24 }}>
          <span className="absolute inset-0 rounded-full border-2 border-white bloom-sm" style={{ ['--c' as string]: '#fff' }} />
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="absolute left-1/2 whitespace-nowrap rounded-full px-1.5" style={{ top: 26, transform: 'translateX(-50%)', background: '#fff', color: 'var(--abyss)', fontSize: 10, fontWeight: 800, lineHeight: '14px' }}>You</span>
        </span>
        <span
          className="absolute whitespace-nowrap rounded-full px-2"
          style={{ left: px(danger.x), top: py(danger.y) - 46, transform: 'translateX(-50%)', background: 'var(--glow-red)', color: 'var(--abyss)', fontSize: 10, fontWeight: 800, lineHeight: '15px' }}
        >
          {danger.junction} · danger
        </span>
        </motion.div>
        <span className="sr-only">Dark zone radius {Math.round(dark)} pixels around {danger.name}</span>
      </motion.div>

      {/* status lines */}
      <div className="mt-1.5 min-h-[44px] text-center">
        <AnimatePresence mode="wait">
          {clear ? (
            <motion.p key="clear" className="t-body" style={{ color: 'var(--calm-blue)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              the water is calm · safe to move
            </motion.p>
          ) : noRoute ? (
            <motion.p key="none" className="t-body" style={{ color: 'var(--glow-amber)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
              no safe route · stay still · Warden notified
            </motion.p>
          ) : (
            <motion.div key="route" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-0.5">
              <p className="t-body">route fits your Depth Mark (levels 1-{max})</p>
              {phase === 'blocked' ? (
                <p className="t-micro" style={{ color: 'var(--glow-amber)' }} role="status">shortcut reaches LEVEL {naive?.points[violation]?.layer} · too deep</p>
              ) : rerouted ? (
                <p className="t-micro" style={{ color: 'var(--glow-cyan)' }} role="status">rerouted to fit your Depth Mark</p>
              ) : (
                <p className="t-micro" data-testid="route-target">
                  {target?.kind === 'level'
                    ? 'every colony here has failed · go up to Level 2'
                    : `nearest safe colony: ${target?.label ?? ''}`}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!clear && (
        <>
          <p className="t-micro text-center" style={{ color: 'var(--text)' }}>
            two pulses = turn · fast = danger behind · steady = clear
          </p>
          <div className="mt-auto flex justify-center pb-1 pt-2">
            <PressureButton
              shape="pill" width={328} height={64} tone="safe"
              label="HOLD · I'M SAFE" holdLabel="keep holding" sub="closes this alert"
              ariaLabel="I'm safe. Press and hold for one second to close this alert."
              onComplete={safeNow}
            />
          </div>
        </>
      )}
    </motion.div>
  )
}
