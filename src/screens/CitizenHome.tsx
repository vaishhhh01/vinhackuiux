import { DepthLadder } from '../components/DepthLadder'
import { LightMap, nearbyColonies } from '../components/LightMap'
import { GlowDot } from '../components/GlowDot'
import { Tideprint } from '../components/Tideprint'
import { citizenById, useStore } from '../state/store'
import { healthOf } from '../logic/thresholds'

/** HOME: who am I, which water am I in, are the lights calm. Big shapes, few words. */
export function CitizenHome({ onMap }: { onMap: () => void }) {
  const me = citizenById(useStore((s) => s.citizenId))
  const mark = useStore((s) => s.depthMark)
  const colonies = useStore((s) => s.colonies)
  const alert = useStore((s) => s.alert)
  const near = nearbyColonies(colonies, me).map((c) => healthOf(c.glow))
  const mood = alert === 'danger' ? 'dying' : near.includes('dying') || near.includes('weak') ? 'weak' : 'healthy'
  const moodWord = alert === 'danger' ? 'district danger' : mood === 'weak' ? 'one colony is fading nearby' : 'all lights are calm'
  const markWord = me.mark[0].toUpperCase() + me.mark.slice(1)

  return (
    <div className="flex h-full flex-col px-4 pb-1 pt-2">
      <div className="flex items-center gap-3">
        <div
          className="grid shrink-0 place-items-center rounded-full bloom-md"
          style={{ width: 76, height: 76, ['--c' as string]: 'var(--glow-cyan)', background: 'radial-gradient(circle, rgba(77,232,210,0.25), rgba(10,34,54,0.95))', border: '2px solid var(--glow-cyan)' }}
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
        <LightMap onOpen={onMap} />
      </div>

      <div className="mt-auto flex justify-center pt-2">
        <button
          type="button"
          onClick={onMap}
          className="flex items-center justify-center gap-3 rounded-[36px] bloom-md"
          style={{
            width: 328, height: 72, ['--c' as string]: 'var(--glow-red)',
            background: 'radial-gradient(120% 220% at 30% 40%, #7a1f2a, #3a0d14)',
            border: '3px solid var(--glow-red)',
          }}
          aria-label="Report theft. Opens the map: press the light you saw it near."
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
