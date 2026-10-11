import type { ReactNode } from 'react'
import { LinkRing } from './LinkRing'
import { AlertPulse } from './AlertPulse'
import { useStore, type Mode } from '../state/store'

interface Props { mode: Mode; children: ReactNode }

/** The 360x640 band: chrome, coral tabs, Current link ring and pulse layer. It never dims or sleeps. */
export function BandShell({ mode, children }: Props) {
  const link = useStore((s) => s.link)
  const alert = useStore((s) => s.alert)
  const citizenSafe = useStore((s) => s.citizenSafe)
  const pulse = useStore((s) => s.pulses[mode])
  const warden = mode === 'warden'
  // the Guard Band gets the heavy white-gold authority ring, never the citizen danger loop
  const inDanger = alert === 'danger' && !warden && !citizenSafe

  const tabColor = warden ? '#8a6d2a' : '#1d6a66'

  return (
    <div
      className="relative overflow-hidden"
      data-testid={`band-${mode}`}
      data-mode={mode}
      style={{
        width: 360, height: 640, borderRadius: 36,
        ['--accent' as string]: warden ? 'var(--warden-gold)' : 'var(--glow-cyan)',
        ['--tab' as string]: tabColor,
        background: 'radial-gradient(120% 80% at 50% 0%, #0f3470 0%, #0a2548 30%, var(--abyss-2) 55%, var(--abyss) 100%)',
        boxShadow: warden
          ? '0 0 0 3px #8a6d2a, 0 0 0 5px rgba(255,233,168,0.55), 0 0 60px rgba(255,233,168,0.28), 0 30px 60px rgba(0,0,0,0.55)'
          : '0 0 0 2px #14495a, 0 0 54px rgba(77,232,210,0.28), 0 30px 60px rgba(0,0,0,0.55)',
      }}
    >
      {/* coral tabs */}
      <div className="coral absolute left-1/2 top-0 z-[45] -translate-x-1/2" style={{ width: 140, height: 14, borderRadius: 7 }} aria-hidden="true" />
      <div className="coral absolute bottom-0 left-1/2 z-[45] -translate-x-1/2" style={{ width: 140, height: 14, borderRadius: 7 }} aria-hidden="true" />

      {/* kelp at the floor. Decoration only. */}
      <svg className="pointer-events-none absolute inset-0" width="360" height="640" viewBox="0 0 360 640" aria-hidden="true">
        {[18, 336].map((x, i) => (
          <g key={x} stroke={warden ? '#8a6d2a' : '#1d6a66'} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.55">
            <path d={`M ${x} 640 C ${x + 14} 600 ${x - 14} 570 ${x} 530`} className="sway" style={{ animationDelay: `${i}s` }} />
            <path d={`M ${x + (i ? -16 : 16)} 640 C ${x + (i ? -2 : 30)} 610 ${x + (i ? -30 : 2)} 585 ${x + (i ? -14 : 18)} 560`} className="sway" style={{ animationDelay: `${i + 1.2}s` }} />
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 pb-[16px] pt-[18px]">{children}</div>

      <AlertPulse event={pulse} persistentDanger={inDanger} />
      <LinkRing state={link} />

    </div>
  )
}
