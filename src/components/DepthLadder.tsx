import layers from '../data/layers.json'
import { GlowDot } from './GlowDot'
import type { Mark } from '../logic/routing'
import { MARK_MAX_LAYER } from '../logic/routing'

const Lock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

/**
 * Five water levels. The level you are in carries a happy Ilyri; levels you may enter are open rings;
 * levels too deep are flat gray with a lock. The legend lives in the shapes, not in a caption.
 */
export function DepthLadder({ mark, current = 1 }: { mark: Mark; current?: number }) {
  const max = MARK_MAX_LAYER[mark]
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Water levels">
      {layers.layers.map((l) => {
        const here = l.n === current
        const allowed = l.n <= max
        const state = here ? 'here' : allowed ? 'allowed' : 'locked'
        return (
          <li
            key={l.n}
            data-state={state}
            className={`flex items-center gap-3 px-3 ${here ? 'bloom-md' : ''}`}
            style={{
              height: 44,
              borderRadius: here ? '26px 18px 26px 18px' : '22px 16px 22px 16px',
              ['--c' as string]: 'var(--glow-cyan)',
              background: here
                ? 'linear-gradient(90deg, rgba(77,232,210,0.5), rgba(77,232,210,0.14))'
                : allowed ? 'rgba(77,232,210,0.05)' : 'var(--locked-gray)',
              border: here
                ? '2px solid var(--glow-cyan)'
                : allowed ? '1.5px dashed rgba(77,232,210,0.45)' : '1.5px solid transparent',
              color: allowed ? 'var(--text)' : 'var(--locked-text)',
            }}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center" aria-hidden="true">
              {here ? <GlowDot health="healthy" size={32} /> : allowed ? <span className="block h-3.5 w-3.5 rounded-full border-2 border-[rgba(77,232,210,0.7)]" /> : <Lock />}
            </span>
            <span className="t-body" style={{ fontSize: 16 }}>
              LEVEL {l.n} · {l.name}
            </span>
            {here && <span className="sr-only">you are in this level</span>}
            {!allowed && <span className="sr-only">too deep for your Depth Mark</span>}
          </li>
        )
      })}
    </ul>
  )
}
