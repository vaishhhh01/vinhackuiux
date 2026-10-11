import { DepthLadder } from '../components/DepthLadder'
import { LightMap } from '../components/LightMap'
import { GlowDot } from '../components/GlowDot'
import { Tideprint } from '../components/Tideprint'
import { citizenById, useMustMove, useStore } from '../state/store'

/** HOME: who am I, which water am I in, are the lights calm. Big shapes, few words. */
export function CitizenHome({ onReport }: { onReport: () => void }) {
  const me = citizenById(useStore((s) => s.citizenId))
  const mark = useStore((s) => s.depthMark)
  const alert = useStore((s) => s.alert)
  const { affected } = useMustMove()
  // only a declared danger changes the mood; a colony fading is not the wearer's to read
  // people outside the affected area see nothing at all: their Home stays exactly as it was
  const mood = alert === 'danger' && affected ? 'dying' : 'healthy'
  const moodWord = alert === 'danger' && affected ? 'district danger' : 'all lights are calm'
  const markWord = me.mark[0].toUpperCase() + me.mark.slice(1)

  return (
    <div className="flex h-full flex-col px-4 pb-1 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="grid shrink-0 place-items-center rounded-full bloom-md"
          style={{ width: 76, height: 76, ['--c' as string]: 'var(--glow-cyan)', background: 'radial-gradient(circle, rgba(77,232,210,0.22), rgba(29,71,92,0.95))', border: '2px solid var(--glow-cyan)' }}
          role="img"
          aria-label={`${me.name}'s Tideprint`}
        >
          <Tideprint seed={me.seed} size={60} glow={false} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="t-hero truncate" style={{ fontSize: 26, lineHeight: 1.1 }}>Hello, {me.name}</div>
          <div className="t-body" style={{ color: 'var(--living-light)', letterSpacing: '0.06em' }} data-testid="tideprint-id">{me.tideprintId}</div>
          <div className="t-micro">Age {me.age} · {markWord} Mark</div>
        </div>
        <div className="shrink-0 bob" role="img" aria-label={moodWord}>
          <GlowDot health={mood} size={52} />
        </div>
      </div>

      <div className="mt-3">
        <DepthLadder mark={mark} current={1} />
      </div>

      <div className="mt-3 flex justify-center">
        <LightMap />
      </div>

      <div className="mt-auto flex justify-center pt-2">
        <button
          type="button"
          onClick={onReport}
          className="flex items-center justify-center gap-3 rounded-[36px] bloom-md"
          style={{
            width: 328, height: 72, ['--c' as string]: 'var(--glow-red)',
            background: 'radial-gradient(120% 220% at 30% 40%, #7a1f2a, #3a0d14)',
            border: '3px solid var(--glow-red)',
          }}
          aria-label="Report theft at the place you are."
        >
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5L22 20.5H2z" fill="rgba(255,90,90,0.35)" stroke="var(--glow-red)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 10v5M12 17.6v.4" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="t-hero" style={{ fontSize: 24, letterSpacing: '0.08em' }}>REPORT</span>
        </button>
      </div>
    </div>
  )
}
