import { line, curveCatmullRom } from 'd3-shape'
import { motion } from 'framer-motion'
import { CurrentLines, MAP_H, MAP_W, VB_H, px, py } from './LightMap'
import { GlowDot, HEALTH_WORD } from './GlowDot'
import { STALE_AFTER_MIN, healthOf } from '../logic/thresholds'
import type { ColonyEval } from '../logic/escalation'
import type { ActivePatrol, Colony } from '../state/store'
import layers from '../data/layers.json'

interface Props {
  colonies: Colony[]
  evals: ColonyEval[]
  selectedId: string | null
  highlightId: string | null
  patrol: ActivePatrol | null
  link: 'connected' | 'weak' | 'lost' | 'reconnecting'
  lostAge: number | null
  dangerId: string | null
  witnesses: Record<string, number>
  onSelect: (id: string) => void
  onBackground: () => void
}

export const ageOf = (c: Colony, lostAge: number | null) => c.baseAge + (lostAge ?? 0)

const patrolLine = line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y).curve(curveCatmullRom.alpha(0.5))

/** Warden district map: every colony, flicker on flags, heat shimmer on suspect clusters, flowing Currents. */
export function LayerMap({ colonies, evals, selectedId, highlightId, patrol, link, lostAge, dangerId, witnesses, onSelect, onBackground }: Props) {
  const danger = colonies.find((c) => c.id === dangerId)
  const lost = link === 'lost'
  const evalOf = (id: string) => evals.find((e) => e.id === id)
  const suspects = colonies.filter((c) => {
    const e = evalOf(c.id)
    return e && (e.escalated || (e.rapid && e.witnesses > 0) || e.dangerReady)
  })
  const ringId = selectedId ?? highlightId
  const ringColony = colonies.find((c) => c.id === ringId)
  const w = layers.warden

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: MAP_W, height: MAP_H, borderRadius: 24,
        background: 'radial-gradient(90% 90% at 50% 40%, #1d475c, #0d2531 88%)',
        border: '2px solid rgba(255,233,168,0.5)',
        opacity: lost ? 0.5 : 1,
        transition: 'opacity 1.2s',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onBackground() }}
      data-testid="layer-map"
    >
      <svg viewBox={`0 0 100 ${VB_H}`} width={MAP_W} height={MAP_H} className="absolute inset-0" aria-hidden="true" onClick={onBackground}>
        <defs>
          <radialGradient id="heat">
            <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff5a5a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <CurrentLines flowing={!lost} />
        {danger && (
          <circle cx={danger.x} cy={danger.y} r={14} fill="rgba(255,90,90,0.22)" stroke="var(--glow-red)" strokeWidth="0.8" strokeDasharray="1.6 1.6" className="pulse-slow" />
        )}
        {suspects.map((c) => (
          <circle key={c.id} cx={c.x} cy={c.y} r="10" fill="url(#heat)" className="flicker" style={{ transformOrigin: `${c.x}px ${c.y}px`, animation: 'shimmer-heat 2.4s ease-in-out infinite' }} />
        ))}
        {patrol && (
          <g>
            <path
              d={patrolLine([patrol.start, ...patrol.order, patrol.start]) ?? ''}
              fill="none" stroke="var(--warden-gold)" strokeWidth="1.1" strokeDasharray="3 2.4" strokeLinecap="round"
              className="flow" style={{ filter: 'drop-shadow(0 0 1.5px var(--warden-gold))' }}
            />
            {patrol.order.map((s, i) => (
              <g key={s.id} transform={`translate(${s.x + 3} ${s.y - 3})`}>
                <circle r="2.4" fill="var(--warden-gold)" />
                <text textAnchor="middle" y="1.1" fontSize="3.2" fontWeight="800" fill="#04121f">{i + 1}</text>
              </g>
            ))}
          </g>
        )}
        {/* the Warden: a gold tide-star */}
        <g transform={`translate(${w.x} ${w.y})`} style={{ filter: 'drop-shadow(0 0 2.5px var(--warden-gold))' }}>
          <path d="M0 -4.6 L1.3 -1.3 L4.6 0 L1.3 1.3 L0 4.6 L-1.3 1.3 L-4.6 0 L-1.3 -1.3 Z" fill="var(--warden-gold)" stroke="var(--warden-gold)" strokeWidth="0.6" strokeLinejoin="round" />
          <circle r="1.1" fill="var(--abyss)" />
        </g>
      </svg>

      {colonies.map((c) => {
        const e = evalOf(c.id)
        const h = healthOf(c.glow)
        const stale = ageOf(c, lostAge) >= STALE_AFTER_MIN && (lost || ageOf(c, lostAge) >= 5)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-label={`${c.name}, ${HEALTH_WORD[h]}${e?.flagged ? ', flagged' : ''}${stale ? ', data stale' : ''}`}
            aria-pressed={selectedId === c.id}
            className="absolute grid place-items-center rounded-full"
            style={{ left: px(c.x) - 32, top: py(c.y) - 32, width: 64, height: 64 }}
            data-colony={c.id}
          >
            <GlowDot health={h} size={38} flagged={e?.flagged} hazy={stale} still={lost} />
            <span className="pointer-events-none absolute left-1/2 whitespace-nowrap rounded-full px-1.5" style={{ top: 'calc(50% + 14px)', transform: 'translateX(-50%)', background: 'rgba(4,18,31,0.72)', color: 'var(--text)', fontSize: 10, fontWeight: 800, lineHeight: '14px' }}>
              {c.name}
            </span>
            {(witnesses[c.id] ?? 0) > 0 && (
              <span className="pointer-events-none absolute -right-0.5 top-1 grid h-6 w-7 place-items-center rounded-full" style={{ background: 'var(--abyss)', border: '1.5px solid var(--text)' }} aria-hidden="true">
                <svg width="18" height="12" viewBox="0 0 24 16"><path d="M1 8 Q12 -2 23 8 Q12 18 1 8 Z" fill="none" stroke="var(--text)" strokeWidth="2.2" /><circle cx="12" cy="8" r="3.4" fill="var(--text)" /></svg>
              </span>
            )}
          </button>
        )
      })}

      <span
        className="pointer-events-none absolute whitespace-nowrap rounded-full px-2"
        style={{ left: px(w.x), top: py(w.y) + 12, transform: 'translateX(-50%)', background: 'var(--warden-gold)', color: 'var(--abyss)', fontSize: 11, fontWeight: 800, lineHeight: '16px' }}
      >
        You · Layer 1
      </span>

      {ringColony && (
        <>
          <span
            key={`ring-${ringColony.id}`}
            className="pointer-events-none absolute rounded-full bloom-md"
            style={{
              left: px(ringColony.x) - 24, top: py(ringColony.y) - 24, width: 48, height: 48,
              border: '3px solid var(--warden-gold)', ['--c' as string]: 'var(--warden-gold)',
            }}
            data-testid="yellow-ring"
          />
          {selectedId && (
            <motion.span
              key={`expand-${ringColony.id}`}
              className="pointer-events-none absolute rounded-full"
              style={{ left: px(ringColony.x) - 24, top: py(ringColony.y) - 24, width: 48, height: 48, border: '3px solid var(--warden-gold)' }}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 9, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          )}
        </>
      )}
    </div>
  )
}
