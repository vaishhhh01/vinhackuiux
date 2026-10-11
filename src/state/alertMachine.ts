import { setup } from 'xstate'

export type AlertEvent =
  | { type: 'SYNC'; level: 'calm' | 'flagged' | 'escalated' }
  | { type: 'DECLARE' }
  | { type: 'AUTO_CRITICAL' }
  | { type: 'PROTECT' }
  | { type: 'ALL_CLEAR' }
  | { type: 'RESET' }
  | { type: 'GOTO'; to: 'calm' | 'flagged' | 'escalated' | 'danger' | 'allClear' }

const sync = [
  { guard: 'isCalm' as const, target: 'calm' },
  { guard: 'isFlagged' as const, target: 'flagged' },
  { guard: 'isEscalated' as const, target: 'escalated' },
]
const toDanger = { DECLARE: 'danger', AUTO_CRITICAL: 'danger' } as const

/**
 * calm -> flagged -> escalated -> danger -> allClear -> calm
 * Sensor level changes arrive as SYNC (derived from colonies + reports). Only DECLARE (Warden)
 * or AUTO_CRITICAL (glow < 20%) can enter `danger`; only PROTECT / ALL_CLEAR leave it.
 */
export const alertMachine = setup({
  types: { events: {} as AlertEvent },
  guards: {
    isCalm: ({ event }) => event.type === 'SYNC' && event.level === 'calm',
    isFlagged: ({ event }) => event.type === 'SYNC' && event.level === 'flagged',
    isEscalated: ({ event }) => event.type === 'SYNC' && event.level === 'escalated',
  },
}).createMachine({
  id: 'alert',
  initial: 'calm',
  // GOTO mirrors a state decided in another window (cross-tab sync); it is never sent by the UI itself
  on: {
    RESET: '.calm',
    GOTO: [
      { guard: ({ event }) => event.type === 'GOTO' && event.to === 'danger', target: '.danger' },
      { guard: ({ event }) => event.type === 'GOTO' && event.to === 'allClear', target: '.allClear' },
      { guard: ({ event }) => event.type === 'GOTO' && event.to === 'escalated', target: '.escalated' },
      { guard: ({ event }) => event.type === 'GOTO' && event.to === 'flagged', target: '.flagged' },
      { guard: ({ event }) => event.type === 'GOTO' && event.to === 'calm', target: '.calm' },
    ],
  },
  states: {
    calm: { on: { SYNC: sync, ...toDanger } },
    flagged: { on: { SYNC: sync, ...toDanger } },
    escalated: { on: { SYNC: sync, ...toDanger } },
    danger: { on: { PROTECT: 'allClear', ALL_CLEAR: 'allClear' } },
    allClear: { after: { 5000: 'calm' }, on: { DECLARE: 'danger', AUTO_CRITICAL: 'danger' } },
  },
})
