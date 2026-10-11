import { line, curveCatmullRom } from 'd3-shape'
import { GlowDot } from './GlowDot'
import { citizenById, useStore, type Colony } from '../state/store'
import { useLostAge } from '../hooks/useNow'
import layers from '../data/layers.json'

/** Map space is 100 x 66 units; the Warden map draws it at 328 x 216 px. */
export const MAP_W = 328
export const MAP_H = 216
export const VB_H = 66
export const px = (x: number) => (x / 100) * MAP_W
export const py = (y: number) => (y / VB_H) * MAP_H

export const currentPath = line<number[]>().x((d) => d[0]).y((d) => d[1]).curve(curveCatmullRom.alpha(0.5))

export function CurrentLines({ opacity = 0.35, flowing = true, width = 0.7 }: { opacity?: number; flowing?: boolean; width?: number }) {
  return (
    <>
      {(layers.currents as number[][][]).map((c, i) => (
        <path
          key={i}
          d={currentPath(c) ?? ''}
          fill="none"
          stroke="var(--glow-cyan)"
          strokeOpacity={opacity}
          strokeWidth={width}
          strokeDasharray={`${width * 3} ${width * 5}`}
          strokeLinecap="round"
          className={flowing ? 'flow' : ''}
          style={{ animationDuration: `${1.2 + i * 0.25}s` }}
        />
      ))}
    </>
  )
}

const NEARBY = 27

export function nearbyColonies(colonies: Colony[], at: { x: number; y: number }): Colony[] {
  return colonies.filter((c) => Math.hypot(c.x - at.x, c.y - at.y) <= NEARBY)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export interface View { x0: number; y0: number; x1: number; y1: number }

interface WaterMapProps {
  view: View
  w: number
  h: number
  colonies: Colony[]
  onPick?: (id: string) => void
  /** which colonies may be pressed; the rest are shown but out of reach */
  canPick?: (c: Colony) => boolean
  dot: number
  you: { x: number; y: number }
  youLabel: string
  dim?: boolean
  soft?: boolean
  rounded?: number
}

/**
 * Citizen water-map: you (ringed pearl) and colony jellyfish on faint flowing Currents.
 * No numbers, no trends. Colonies are real buttons (>= 64 px hit area) when `onPick` is given.
 */
export function WaterMap({ view, w, h, colonies, onPick, canPick, dot, you, youLabel, dim, soft, rounded = 28 }: WaterMapProps) {
  const sx = w / (view.x1 - view.x0)
  const sy = h / (view.y1 - view.y0)
  const X = (x: number) => (x - view.x0) * sx
  const Y = (y: number) => (y - view.y0) * sy
  const hit = Math.max(64, dot + 12)
  const visible = colonies.filter((c) => c.x >= view.x0 - 2 && c.x <= view.x1 + 2 && c.y >= view.y0 - 2 && c.y <= view.y1 + 2)
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: w, height: h, borderRadius: rounded,
        background: 'radial-gradient(90% 90% at 50% 35%, #1d475c, #0d2531 88%)',
        border: '1.5px solid rgba(91,141,137,0.55)',
        opacity: dim ? 0.5 : 1,
        filter: soft ? 'blur(0.5px)' : undefined,
        transition: 'opacity 1.2s, filter 0.8s',
      }}
      data-testid="light-map"
    >
      <svg viewBox={`${view.x0} ${view.y0} ${view.x1 - view.x0} ${view.y1 - view.y0}`} width={w} height={h} className="absolute inset-0" aria-hidden="true">
        <CurrentLines flowing={!dim} width={Math.max(0.5, 3.2 / sx)} />
      </svg>
      {visible.map((c) => {
        // Thalassari see places, not health: every light looks the same. Danger is the Warden's call to make.
        const inner = <GlowDot health="healthy" size={dot} hazy={dim} still={dim} />
        const reachable = !canPick || canPick(c)
        return onPick && reachable ? (
          <button
            key={c.id}
            type="button"
            aria-label={`${c.name}. You are here: press to report.`}
            onClick={() => onPick(c.id)}
            className="absolute grid place-items-center rounded-full"
            style={{ left: X(c.x) - hit / 2, top: Y(c.y) - hit / 2, width: hit, height: hit }}
          >
            {inner}
            <span className="t-micro absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ color: 'var(--text)', fontSize: 11 }}>
              {c.name}
            </span>
          </button>
        ) : (
          <span
            key={c.id}
            className="absolute grid place-items-center"
            style={{ left: X(c.x) - dot / 2, top: Y(c.y) - dot / 2, opacity: onPick ? 0.45 : 1 }}
          >
            {inner}
            <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-full px-1.5" style={{ background: 'rgba(4,18,31,0.72)', color: 'var(--text)', fontSize: 11, fontWeight: 800, lineHeight: '16px' }}>{c.name}</span>
          </span>
        )
      })}
      <div
        className="absolute grid place-items-center"
        style={{ left: X(you.x) - 16, top: Y(you.y) - 16, width: 32, height: 32 }}
        role="img"
        aria-label="You"
      >
        <span className="absolute inset-0 rounded-full border-2 border-white/90 bloom-sm" style={{ ['--c' as string]: '#fff' }} />
        <span className="h-3 w-3 rounded-full bg-white" />
        <span className="pointer-events-none absolute left-1/2 whitespace-nowrap rounded-full px-2" style={{ top: 'calc(100% + 1px)', transform: 'translateX(-50%)', background: '#fff', color: 'var(--abyss)', fontSize: 11, fontWeight: 800, lineHeight: '17px' }}>
          {youLabel}
        </span>
      </div>
    </div>
  )
}

/** Small home map: where you are among the nearby lights. A view only. */
export function LightMap() {
  const colonies = useStore((s) => s.colonies)
  const link = useStore((s) => s.link)
  const me = citizenById(useStore((s) => s.citizenId))
  const home = colonies.find((c) => c.id === me.colonyId)
  const lostAge = useLostAge()
  const dim = link === 'lost'
  const x0 = clamp(me.x - 43, 0, 14)
  const y0 = clamp(me.y - 17, 0, 35)
  return (
    <div className="relative" style={{ width: 328, height: 124 }} data-testid="home-map">
      <WaterMap
        view={{ x0, y0, x1: x0 + 86, y1: y0 + 31 }}
        w={328} h={124}
        colonies={nearbyColonies(colonies, me)}
        you={me}
        youLabel={`You · ${home?.junction ?? 'Level 1'}`}
        dot={36} dim={dim} soft={link === 'weak'}
      />
      {dim && (
        <span className="t-micro absolute inset-x-0 bottom-1 text-center" style={{ color: 'var(--text)' }} role="status">
          Current silent · last known · {lostAge} min ago
        </span>
      )}
    </div>
  )
}
