import { useMemo } from 'react'
import { create } from 'zustand'
import { createActor } from 'xstate'
import coloniesSeed from '../data/colonies.json'
import reportsSeed from '../data/reports.json'
import citizensSeed from '../data/citizens.json'
import layers from '../data/layers.json'
import { alertMachine } from './alertMachine'
import { offlineQueue, type QueueItem } from './queue'
import { PulseHaptics, type PulseKind } from '../components/PulseHaptics'
import {
  criticalIds, dangerCandidate, districtLevel, evaluateAll, sortCases, type ColonyEval,
} from '../logic/escalation'
import { planPatrol, type Mark, type Patrol, type Stop } from '../logic/routing'
import { fallingHistory } from '../logic/thresholds'

export type Mode = 'citizen' | 'warden'
export type LinkState = 'connected' | 'weak' | 'lost' | 'reconnecting'
export type AlertState = 'calm' | 'flagged' | 'escalated' | 'danger' | 'allClear'
export type CaseStatus = 'open' | 'investigating' | 'confirmed' | 'protected' | 'recovered'

export interface Colony {
  id: string; name: string; junction: string; layer: number; x: number; y: number
  norm: number; glow: number; history: number[]; current: 'calm' | 'disturbed'
  baseAge: number; flaggedCycles: number
}
export interface Report {
  id: string; tideprint: number; citizenId: string; colonyId: string
  destinationId: string | null | undefined
  at: number; seenAt?: number; handled: boolean; own?: boolean
}
export interface PulseEvent { id: number; kind: PulseKind }
export interface ActivePatrol extends Patrol { start: { x: number; y: number } }

export interface Citizen {
  id: string; name: string; age: number; mark: Mark; seed: number; tideprintId: string
  /** where this wearer is right now (map units) and the colony they stand at */
  x: number; y: number; colonyId: string
}
export const CITIZENS = citizensSeed as Citizen[]
export const citizenById = (id: string) => CITIZENS.find((c) => c.id === id) ?? CITIZENS[0]
export const SYNC_KEYS = [
  'colonies', 'reports', 'caseStatus', 'link', 'lostAt', 'alert', 'dangerColonyId', 'dangerSource', 'bandsAlerted',
  'citizenSafe', 'pulses', 'queue', 'mockCursor', 'patrol', 'routeBlocked', 'routeDemoNonce', 'lastReport',
  'depthMark', 'citizenId',
] as const
export const HOME_COLONY = 'garden-3'
export const BANDS_ALERTED = 214
export const DANGER_RADIUS = layers.dangerRadius

const seedColonies = (): Colony[] => structuredClone(coloniesSeed) as Colony[]

interface State {
  mode: Mode
  sideBySide: boolean
  colonies: Colony[]
  reports: Report[]
  caseStatus: Record<string, CaseStatus>
  depthMark: Mark
  citizenId: string
  link: LinkState
  lostAt: number | null
  alert: AlertState
  dangerColonyId: string | null
  dangerSource: 'warden' | 'sensor' | null
  bandsAlerted: number | null
  citizenSafe: boolean
  pulses: { citizen?: PulseEvent; warden?: PulseEvent }
  announce: { text: string; assertive: boolean; n: number }
  selectedColonyId: string | null
  highlightColonyId: string | null
  selectedCaseId: string | null
  patrol: ActivePatrol | null
  lastReport: { id: string; phase: 'sent' | 'saved' } | null
  queue: QueueItem[]
  mockCursor: number
  routeDemoNonce: number
  routeBlocked: boolean
  citizenPanel: 0 | 1

  setMode(m: Mode): void
  setSideBySide(b: boolean): void
  setDepthMark(m: Mark): void
  setCitizen(id: string): void
  applyRemote(p: Record<string, unknown>): void
  setCitizenPanel(p: 0 | 1): void
  dropColony(to: number, id?: string): void
  sendMockReport(): void
  submitReport(colonyId: string): string
  setDestination(reportId: string, colonyId: string | null): void
  handleReport(id: string): void
  setCaseStatus(colonyId: string, s: CaseStatus): void
  declareDanger(colonyId?: string): void
  allClear(): void
  citizenSafeNow(): void
  setLink(l: 'connected' | 'weak' | 'lost'): void
  select(id: string | null): void
  highlight(id: string | null): void
  selectCase(id: string | null): void
  startPatrol(extraStopId?: string): void
  clearPatrol(): void
  triggerRouteDemo(): void
  setRouteBlocked(b: boolean): void
  hydrateQueue(): Promise<void>
  say(text: string, assertive?: boolean): void
  reset(): void
}

let pulseId = 0
let criticalSeen = new Set<string>()

export const useStore = create<State>()((set, get) => {
  const emit = (kind: PulseKind, aud: 'citizen' | 'warden' | 'both', haptic = true) => {
    const ev = { id: ++pulseId, kind }
    set((s) => ({
      pulses: {
        citizen: aud !== 'warden' ? ev : s.pulses.citizen,
        warden: aud !== 'citizen' ? ev : s.pulses.warden,
      },
    }))
    if (haptic && kind !== 'danger') PulseHaptics.play(kind)
  }
  const say = (text: string, assertive = false) => set((s) => ({ announce: { text, assertive, n: s.announce.n + 1 } }))

  const evalNow = () => evaluateAll(get().colonies, get().reports)

  const flushQueue = () => {
    const { queue } = get()
    if (!queue.length) return
    const newReports: Report[] = []
    let declare: QueueItem | null = null
    for (const q of queue) {
      if (q.kind === 'report') newReports.push(q.payload as unknown as Report)
      else declare = q
      void offlineQueue.remove(q.id)
    }
    set((s) => ({
      queue: [],
      reports: [...s.reports, ...newReports.map((r) => ({ ...r, seenAt: Date.now() }))],
      lastReport: s.lastReport?.phase === 'saved' ? { ...s.lastReport, phase: 'sent' } : s.lastReport,
    }))
    if (newReports.length) say('Report sent', false)
    if (declare) {
      const p = declare.payload as { allClear?: boolean; colonyId?: string }
      if (p.allClear) actions.allClear(true)
      else actions.declareDanger(p.colonyId, true)
    }
    reconcile()
  }

  /** Re-derive the district level from data and feed the XState machine. */
  const reconcile = () => {
    const evals = evalNow()
    const crit = new Set(criticalIds(evals))
    criticalSeen = new Set([...criticalSeen].filter((id) => crit.has(id)))
    const fresh = [...crit].filter((id) => !criticalSeen.has(id))
    crit.forEach((id) => criticalSeen.add(id))
    if (fresh.length) {
      const was = machine.getSnapshot().value
      if (was !== 'danger') {
        set({ dangerColonyId: fresh[0], dangerSource: 'sensor', bandsAlerted: BANDS_ALERTED, citizenSafe: false })
      }
      machine.send({ type: 'AUTO_CRITICAL' })
      if (was !== 'danger') {
        emit('danger', 'citizen', false)
        emit('warden', 'warden', false)
        say('District danger. Colony lights failing.', true)
      }
    } else {
      machine.send({ type: 'SYNC', level: districtLevel(evals) })
    }
  }

  const machine = createActor(alertMachine)
  let prev: AlertState = 'calm'
  machine.subscribe((snap) => {
    const next = snap.value as AlertState
    if (next === prev) return
    const was = prev
    prev = next
    set({ alert: next })
    if (next === 'danger') {
      set({ citizenSafe: false })
      PulseHaptics.stop()
      PulseHaptics.play('danger')
    }
    if (next === 'allClear') {
      PulseHaptics.stop()
      emit('allClear', 'both')
      say('All clear. District is safe.', true)
    }
    if (next === 'calm' && was === 'allClear') {
      set({ dangerColonyId: null, dangerSource: null, bandsAlerted: null })
      queueMicrotask(reconcile)
    }
    if (next === 'calm' && was !== 'allClear') PulseHaptics.stop()
  })
  machine.start()
  // the seed already contains flagged colonies: bring the machine from calm to flagged
  queueMicrotask(reconcile)

  const actions = {
    declareDanger(colonyId?: string, fromQueue = false) {
      const target = colonyId ?? dangerCandidate(evalNow())?.id ?? get().selectedColonyId ?? HOME_COLONY
      if (!target) return
      if (get().link === 'lost' && !fromQueue) {
        const item: QueueItem = { id: 'declare', kind: 'declare', payload: { colonyId: target }, createdAt: Date.now() }
        set((s) => ({ queue: [...s.queue.filter((q) => q.id !== 'declare'), item] }))
        void offlineQueue.put(item)
        emit('warden', 'warden')
        say('Danger declaration saved. Sends when Current returns.')
        return
      }
      set({ dangerColonyId: target, dangerSource: 'warden', bandsAlerted: BANDS_ALERTED, citizenSafe: false })
      machine.send({ type: 'DECLARE' })
      emit('danger', 'citizen', false)
      emit('warden', 'warden', false)
      say('District danger declared. 214 bands alerted.', true)
    },
    allClear(fromQueue = false) {
      if (get().alert !== 'danger') return
      if (get().link === 'lost' && !fromQueue) {
        const item: QueueItem = { id: 'declare', kind: 'declare', payload: { allClear: true }, createdAt: Date.now() }
        set((s) => ({ queue: [...s.queue.filter((q) => q.id !== 'declare'), item] }))
        void offlineQueue.put(item)
        say('All clear saved. Sends when Current returns.')
        return
      }
      machine.send({ type: 'ALL_CLEAR' })
    },
  }

  return {
    mode: 'citizen',
    sideBySide: false,
    colonies: seedColonies(),
    reports: [],
    caseStatus: {},
    depthMark: 'middle',
    citizenId: 'naela',
    link: 'connected',
    lostAt: null,
    alert: 'calm',
    dangerColonyId: null,
    dangerSource: null,
    bandsAlerted: null,
    citizenSafe: false,
    pulses: {},
    announce: { text: '', assertive: false, n: 0 },
    selectedColonyId: null,
    highlightColonyId: null,
    selectedCaseId: null,
    patrol: null,
    lastReport: null,
    queue: [],
    mockCursor: 0,
    routeDemoNonce: 0,
    routeBlocked: false,
    citizenPanel: 0,

    setMode: (mode) => set({ mode }),
    setSideBySide: (sideBySide) => set({ sideBySide }),
    setDepthMark: (depthMark) => set({ depthMark }),
    setCitizen: (id) => set({ citizenId: id, depthMark: citizenById(id).mark, lastReport: null, citizenSafe: false }),
    applyRemote(p) {
      const { alert: remoteAlert, ...rest } = p as { alert?: AlertState }
      set(rest as Partial<State>)
      criticalSeen = new Set(criticalIds(evalNow()))
      if (remoteAlert && remoteAlert !== get().alert) machine.send({ type: 'GOTO', to: remoteAlert })
    },
    setCitizenPanel: (citizenPanel) => set({ citizenPanel }),
    say,

    dropColony(to, id) {
      const target = id ?? get().selectedColonyId ?? HOME_COLONY
      const before = get().colonies.find((c) => c.id === target)
      if (!before) return
      const from = Math.max(before.history[0], to + 22)
      set((s) => ({
        colonies: s.colonies.map((c) =>
          c.id === target
            ? { ...c, glow: to, history: fallingHistory(from, to), flaggedCycles: c.flaggedCycles + 2 }
            : c,
        ),
      }))
      if (before.glow >= 70 && to < 70) emit('caution', 'both')
      say(`${before.name} glow ${to} percent`)
      reconcile()
    },

    sendMockReport() {
      const { mockCursor, selectedColonyId, link } = get()
      const seed = reportsSeed[mockCursor % reportsSeed.length]
      const who = citizenById(seed.citizenId)
      const rep: Report = {
        id: `m-${Date.now()}-${mockCursor}`,
        tideprint: who.seed,
        citizenId: who.id,
        colonyId: selectedColonyId ?? who.colonyId,
        destinationId: seed.destinationId,
        at: Date.now() - seed.minutesAgo * 60000,
        seenAt: Date.now(),
        handled: false,
      }
      set({ mockCursor: mockCursor + 1 })
      if (link === 'lost') {
        const q: QueueItem = { id: rep.id, kind: 'report', payload: rep as unknown as Record<string, unknown>, createdAt: Date.now() }
        set((s) => ({ queue: [...s.queue, q] }))
        void offlineQueue.put(q)
        return
      }
      set((s) => ({ reports: [...s.reports, rep] }))
      emit('warden', 'warden')
      say('New theft report received')
      reconcile()
    },

    submitReport(colonyId) {
      const me = citizenById(get().citizenId)
      const rep: Report = {
        id: `own-${Date.now()}`, tideprint: me.seed, citizenId: me.id, seenAt: Date.now(), colonyId,
        destinationId: undefined, at: Date.now(), handled: false, own: true,
      }
      if (get().link === 'lost') {
        const q: QueueItem = { id: rep.id, kind: 'report', payload: rep as unknown as Record<string, unknown>, createdAt: Date.now() }
        set((s) => ({ queue: [...s.queue, q], lastReport: { id: rep.id, phase: 'saved' } }))
        void offlineQueue.put(q)
        emit('caution', 'citizen')
        say('Report saved. Sends when Current returns.')
      } else {
        set((s) => ({ reports: [...s.reports, rep], lastReport: { id: rep.id, phase: 'sent' } }))
        emit('info', 'citizen')
        emit('warden', 'warden')
        say('Report sent')
        reconcile()
      }
      return rep.id
    },

    setDestination(reportId, colonyId) {
      set((s) => ({
        reports: s.reports.map((r) => (r.id === reportId ? { ...r, destinationId: colonyId } : r)),
        queue: s.queue.map((q) => {
          if (q.id !== reportId) return q
          const nq = { ...q, payload: { ...q.payload, destinationId: colonyId } }
          void offlineQueue.put(nq)
          return nq
        }),
      }))
      say(colonyId ? 'Destination added' : 'Destination unknown')
    },

    handleReport(id) {
      set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, handled: true } : r)) }))
      say('Report handled')
      reconcile()
    },

    setCaseStatus(colonyId, status) {
      set((s) => ({ caseStatus: { ...s.caseStatus, [colonyId]: status } }))
      emit('warden', 'warden')
      if (status === 'protected' || status === 'recovered') {
        const level = status === 'recovered' ? 92 : 74
        set((s) => ({
          colonies: s.colonies.map((c) =>
            c.id === colonyId
              ? { ...c, glow: level, history: Array(12).fill(level), flaggedCycles: 0, current: 'calm' as const }
              : c,
          ),
          reports: s.reports.map((r) => (r.colonyId === colonyId ? { ...r, handled: true } : r)),
          patrol: null,
          selectedCaseId: s.selectedCaseId === colonyId ? null : s.selectedCaseId,
        }))
        say(`Colony ${status}`)
        if (get().alert === 'danger' && get().dangerColonyId === colonyId) {
          if (get().link === 'lost') actions.allClear()
          else machine.send({ type: 'PROTECT' })
        }
      }
      reconcile()
    },

    declareDanger: actions.declareDanger,
    allClear: () => actions.allClear(),
    citizenSafeNow() {
      set({ citizenSafe: true })
      PulseHaptics.stop()
      say('Marked safe')
    },

    setLink(l) {
      const cur = get().link
      if (l === cur && l !== 'connected') return
      if (l === 'lost') {
        set({ link: 'lost', lostAt: Date.now() })
        say('Current silent')
        emit('caution', 'both', false)
      } else if (l === 'weak') {
        set({ link: 'weak', lostAt: null })
        say('Current weak')
      } else {
        // restore
        if (cur === 'connected') return
        set({ link: 'reconnecting', lostAt: null })
        emit('info', 'both')
        say('Current returned')
        flushQueue()
        setTimeout(() => {
          if (get().link === 'reconnecting') set({ link: 'connected' })
        }, 2400)
      }
    },

    select(id) {
      set({ selectedColonyId: id, highlightColonyId: id })
    },
    highlight(id) {
      set({ highlightColonyId: id })
      if (id) setTimeout(() => get().highlightColonyId === id && !get().selectedColonyId && set({ highlightColonyId: null }), 3200)
    },
    selectCase(id) {
      set({ selectedCaseId: id, highlightColonyId: id })
    },

    startPatrol(extraStopId) {
      const evals = sortCases(evalNow())
      const ids = evals.map((e) => e.id)
      if (extraStopId && !ids.includes(extraStopId)) ids.unshift(extraStopId)
      const stops: Stop[] = ids.slice(0, 4).flatMap((id) => {
        const c = get().colonies.find((x) => x.id === id)
        return c ? [{ id, x: c.x, y: c.y }] : []
      })
      if (!stops.length) {
        say('Nothing to patrol')
        return
      }
      const start = layers.warden
      const p = planPatrol(start, stops, layers.currents as number[][][])
      set({ patrol: { ...p, start } })
      say(`Patrol ${p.order.length} stops, ${p.minutes} minutes`)
    },
    clearPatrol: () => set({ patrol: null }),

    triggerRouteDemo: () => {
      set((s) => ({ routeDemoNonce: s.routeDemoNonce + 1, routeBlocked: false }))
      const s = get()
      if (s.alert !== 'danger') {
        // the guard demo needs a live alert to draw on
        const id = dangerCandidate(evalNow())?.id ?? HOME_COLONY
        set({ dangerColonyId: id, dangerSource: 'warden', bandsAlerted: BANDS_ALERTED, citizenSafe: false })
        machine.send({ type: 'DECLARE' })
        emit('danger', 'citizen', false)
        say('District danger', true)
      } else if (s.citizenSafe) {
        set({ citizenSafe: false })
      }
    },
    setRouteBlocked: (routeBlocked) => set({ routeBlocked }),

    async hydrateQueue() {
      const items = await offlineQueue.all()
      if (!items.length) return
      set((s) => ({ queue: [...items, ...s.queue.filter((q) => !items.some((i) => i.id === q.id))] }))
      if (get().link === 'connected') flushQueue()
    },

    reset() {
      PulseHaptics.stop()
      criticalSeen = new Set()
      void offlineQueue.clear()
      set({
        colonies: seedColonies(), reports: [], caseStatus: {}, link: 'connected', lostAt: null,
        dangerColonyId: null, dangerSource: null, bandsAlerted: null, citizenSafe: false,
        selectedColonyId: null, highlightColonyId: null, selectedCaseId: null, patrol: null,
        lastReport: null, queue: [], mockCursor: 0, routeBlocked: false, citizenPanel: 0,
      })
      machine.send({ type: 'RESET' })
      reconcile()
      say('Simulation reset')
    },
  }
})

/* ---------------- hooks ---------------- */

export function useEvals(): ColonyEval[] {
  const colonies = useStore((s) => s.colonies)
  const reports = useStore((s) => s.reports)
  return useMemo(() => evaluateAll(colonies, reports), [colonies, reports])
}

export function colonyById(colonies: Colony[], id: string | null | undefined) {
  return colonies.find((c) => c.id === id)
}
