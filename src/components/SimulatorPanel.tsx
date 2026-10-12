import { useStore } from '../state/store'
import { PulseHaptics, PULSE_COLOR, type PulseKind } from './PulseHaptics'
import type { LinkState } from '../state/store'

type Tone = 'amber' | 'red' | 'light' | 'gold' | 'cyan'
const TONE: Record<Tone, string> = {
  amber: 'var(--glow-amber)',
  red: 'var(--glow-red)',
  light: 'var(--living-light)',
  gold: 'var(--warden-gold)',
  cyan: 'var(--glow-cyan)',
}

function Action({ tone, title, hint, onClick }: { tone: Tone; title: string; hint: string; onClick: () => void }) {
  const c = TONE[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center justify-center text-center transition-transform active:scale-[0.98]"
      style={{
        minHeight: 64, padding: '8px 14px', borderRadius: 24,
        background: `color-mix(in srgb, ${c} 10%, rgba(255,255,255,0.03))`,
        border: `1.5px solid color-mix(in srgb, ${c} 55%, transparent)`,
      }}
    >
      <span className="t-body block" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</span>
      <span className="block text-[12px] font-bold" style={{ color: 'var(--text-70)' }}>{hint}</span>
    </button>
  )
}

/**
 * SIMULATION: the presentation tool. It sits on the right, always visible and clearly labelled,
 * so a viewer knows these buttons make the world do things, and are not part of the band.
 */
export function SimulatorPanel() {
  const s = useStore()
  return (
    <div data-testid="simulator" className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-2">
        <span className="relative grid h-3 w-3 place-items-center" aria-hidden="true">
          <span className="absolute h-3 w-3 animate-ping rounded-full bg-[var(--living-light)] opacity-60" />
          <span className="h-2 w-2 rounded-full bg-[var(--living-light)]" />
        </span>
        <h2 className="t-header text-center" style={{ fontSize: 18, letterSpacing: '0.2em', color: 'var(--living-light)', textShadow: '0 0 12px color-mix(in srgb, var(--living-light) 60%, transparent)' }}>SIMULATION</h2>
      </div>

      <div className="flex flex-col gap-2">
        <Action tone="amber" title="Someone reports" hint="an eye reaches the Warden" onClick={s.sendMockReport} />
        <Action tone="amber" title="Colony fades" hint="a case appears, no alarm" onClick={() => s.dropColony(42)} />
        <Action tone="red" title="Colony goes dark" hint="the alarm fires by itself" onClick={() => s.dropColony(18)} />
        <Action tone="red" title="Every colony fails" hint="rare: go to nearest district" onClick={s.failAll} />
        <Action tone="gold" title="Shortcut test" hint="watch the depth guard" onClick={s.triggerRouteDemo} />
      </div>

      <button
        type="button"
        onClick={() => { PulseHaptics.stop(); s.reset() }}
        className="t-body rounded-full"
        style={{ height: 52, border: '1.5px solid rgba(98,139,123,0.7)', color: 'var(--text)', fontSize: 15 }}
      >
        Reset simulation
      </button>
    </div>
  )
}

/* ---------------- left side: the Current (3 colour-coded buttons) ---------------- */

const SIGNALS: { s: 'lost' | 'weak' | 'connected'; label: string; color: string; match: LinkState[] }[] = [
  { s: 'lost', label: 'Cut', color: '#8b9aa4', match: ['lost'] },
  { s: 'weak', label: 'Weak', color: 'var(--glow-amber)', match: ['weak'] },
  { s: 'connected', label: 'Strong', color: 'var(--glow-cyan)', match: ['connected', 'reconnecting'] },
]

export function CurrentControls() {
  const link = useStore((s) => s.link)
  const set = useStore((s) => s.setLink)
  const queued = useStore((s) => s.queue.length)
  return (
    <section aria-label="The Current" data-testid="current-controls">
      <h3 className="t-header mb-1.5" style={{ color: 'var(--text-70)', fontSize: 12, letterSpacing: '0.18em' }}>THE CURRENT</h3>
      <div className="grid grid-cols-3 gap-1.5">
        {SIGNALS.map((x) => {
          const on = x.match.includes(link)
          return (
            <button
              key={x.s}
              type="button"
              onClick={() => set(x.s)}
              aria-pressed={on}
              className="flex flex-col items-center justify-center gap-1 rounded-[20px]"
              style={{
                height: 64,
                background: on ? `color-mix(in srgb, ${x.color} 24%, transparent)` : 'rgba(255,255,255,0.04)',
                border: `2px solid ${on ? x.color : `color-mix(in srgb, ${x.color} 40%, transparent)`}`,
                boxShadow: on ? `0 0 16px color-mix(in srgb, ${x.color} 50%, transparent)` : undefined,
              }}
            >
              <span
                className={`h-3.5 w-3.5 rounded-full ${on && x.s !== 'lost' ? 'pulse-slow' : ''}`}
                style={{ background: x.s === 'lost' ? 'transparent' : x.color, border: `2.5px ${x.s === 'weak' ? 'dashed' : 'solid'} ${x.color}` }}
                aria-hidden="true"
              />
              <span className="t-body" style={{ fontSize: 14, color: on ? x.color : 'var(--text)' }}>{x.label}</span>
            </button>
          )
        })}
      </div>
      {queued > 0 && <p className="mt-1 text-[12px] font-bold" style={{ color: 'var(--glow-amber)' }}>{queued} waiting to send</p>}
    </section>
  )
}

/* ---------------- left side: pulse legend, one glance each ---------------- */

const LEGEND: { k: PulseKind; name: string; look: string; vib: string }[] = [
  { k: 'info', name: 'Stable', look: '1 soft ring', vib: 'tap' },
  { k: 'caution', name: 'Caution', look: '2 slow rings', vib: 'tap-tap' },
  { k: 'danger', name: 'Danger', look: '2 fast red', vib: 'buzz-buzz' },
  { k: 'allClear', name: 'All clear', look: '1 long ring', vib: 'long' },
  { k: 'warden', name: 'Warden', look: '1 heavy gold', vib: 'thud' },
]

const DOTS: Record<PulseKind, number> = { info: 1, caution: 2, danger: 2, allClear: 1, warden: 1 }

export function PulseLegend() {
  return (
    <section aria-label="Pulse patterns" data-testid="legend">
      <h3 className="t-header mb-1.5" style={{ color: 'var(--text-70)', fontSize: 12, letterSpacing: '0.18em' }}>PULSES</h3>
      <ul className="flex flex-col gap-1">
        {LEGEND.map((l) => (
          <li key={l.k} className="flex items-center gap-2.5" style={{ minHeight: 34 }}>
            <span
              className="relative grid h-6 w-6 shrink-0 place-items-center"
              aria-hidden="true"
            >
              <span
                className={`absolute inset-0 rounded-full ${l.k === 'danger' ? 'pulse-double' : l.k === 'caution' ? 'pulse-slow' : 'pulse-steady'}`}
                style={{ border: `2px solid ${PULSE_COLOR[l.k]}`, boxShadow: `0 0 10px ${PULSE_COLOR[l.k]}` }}
              />
              <span className="h-2 w-2 rounded-full" style={{ background: PULSE_COLOR[l.k] }} />
            </span>
            <span className="leading-tight">
              <span className="t-body block" style={{ fontSize: 14 }}>{l.name}</span>
              <span className="block text-[11px] font-bold" style={{ color: 'var(--text-70)' }}>
                {l.look}
              </span>
            </span>
            <span className="ml-auto flex gap-0.5" aria-label={`${DOTS[l.k]} pulse${DOTS[l.k] > 1 ? 's' : ''}`}>
              {Array.from({ length: DOTS[l.k] }, (_, i) => (
                <span key={i} className="h-1.5 rounded-full" style={{ width: l.k === 'allClear' ? 18 : 6, background: PULSE_COLOR[l.k] }} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
