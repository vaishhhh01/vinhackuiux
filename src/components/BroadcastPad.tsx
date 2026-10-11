import { PressureButton, type PadState } from './PressureButton'
import { BANDS_ALERTED, useStore } from '../state/store'
import type { ColonyEval } from '../logic/escalation'

/**
 * Pinned DECLARE DISTRICT DANGER pad.
 * inactive: gray "needs 2 reports"; active: huge breathing red, hold 1 s; then flood + "214 bands alerted".
 */
export function BroadcastPad({ candidate }: { candidate: ColonyEval | null }) {
  const alert = useStore((s) => s.alert)
  const source = useStore((s) => s.dangerSource)
  const queue = useStore((s) => s.queue)
  const declare = useStore((s) => s.declareDanger)
  const allClear = useStore((s) => s.allClear)
  const say = useStore((s) => s.say)
  const bands = useStore((s) => s.bandsAlerted) ?? BANDS_ALERTED

  const waiting = queue.some((q) => q.kind === 'declare' && !(q.payload as { allClear?: boolean }).allClear)
  const clearWaiting = queue.some((q) => q.kind === 'declare' && (q.payload as { allClear?: boolean }).allClear)
  const danger = alert === 'danger'
  const active = !!candidate

  if (danger) {
    return (
      <div className="flex flex-col items-center gap-2" data-testid="broadcast-pad" data-state="declared">
        <PressureButton
          shape="pill" width={328} height={72} tone="declare" state="declared"
          label="DANGER DECLARED" doneLabel={source === 'sensor' ? 'AUTO ALERT SENT' : 'DANGER DECLARED'}
          doneSub={`${bands} bands alerted`}
          ariaLabel={`Danger declared. ${bands} bands alerted.`}
          onComplete={() => undefined}
        />
        <button
          type="button"
          onClick={allClear}
          className="t-body rounded-full"
          style={{ width: 328, height: 64, border: '2px solid var(--calm-blue)', background: 'rgba(111,182,255,0.15)', color: 'var(--calm-blue)', letterSpacing: '0.12em', ['--c' as string]: 'var(--calm-blue)' }}
          aria-label="Send all clear to every citizen band"
        >
          {clearWaiting ? 'ALL CLEAR SAVED · SENDS ON RECONNECT' : 'ALL CLEAR'}
        </button>
      </div>
    )
  }

  const state: PadState = waiting ? 'waiting' : 'idle'
  return (
    <div className="flex flex-col items-center" data-testid="broadcast-pad" data-state={waiting ? 'waiting' : active ? 'active' : 'inactive'}>
      <PressureButton
        shape="pill" width={328} height={active ? 80 : 72}
        tone={active || waiting ? 'declare' : 'muted'}
        breathing={active || waiting}
        state={state}
        label={active ? 'HOLD TO DECLARE DANGER' : 'DECLARE DANGER'}
        sub={active ? 'every Thalassari band lights up' : 'waiting for an eye'}
        doneLabel="DECLARATION SAVED"
        doneSub="sends when Current returns"
        ariaLabel={
          active
            ? 'Declare district danger. Press and hold for one second. Alerts all citizen bands.'
            : 'Declare danger is locked. Needs two reports and rapid decline.'
        }
        onBlocked={() => say('Declare danger needs 2 reports and a rapidly declining colony')}
        onComplete={() => declare(candidate?.id)}
        autoReset={false}
      />
    </div>
  )
}
