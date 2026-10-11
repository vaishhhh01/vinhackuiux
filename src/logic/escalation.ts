import {
  CRITICAL_BELOW, REPORTS_FOR_DANGER, drop24, healthOf, isCritical, isRapid, isWatch, type Health,
} from './thresholds'

export type Chip = 'ESCALATED' | 'CRITICAL' | 'WATCH'
export type DistrictLevel = 'calm' | 'flagged' | 'escalated'

export interface ColonyLike { id: string; glow: number; history: number[] }
export interface ReportLike { colonyId: string; handled?: boolean }

export interface ColonyEval {
  id: string
  glow: number
  health: Health
  drop: number
  watch: boolean
  rapid: boolean
  critical: boolean
  witnesses: number
  flagged: boolean
  escalated: boolean
  chip: Chip | null
  /** The Warden may declare danger from this colony: at least one witness, or it is already red. */
  dangerReady: boolean
}

export function evaluateColony(c: ColonyLike, witnesses: number): ColonyEval {
  const watch = isWatch(c.glow)
  const rapid = isRapid(c.history)
  const critical = isCritical(c.glow)
  const flagged = watch || rapid
  // any witness makes it a case, even on a colony the sensors still call healthy
  const escalated = witnesses >= 1
  const chip: Chip | null = escalated ? 'ESCALATED' : critical ? 'CRITICAL' : flagged ? 'WATCH' : null
  const health = healthOf(c.glow)
  return {
    id: c.id, glow: c.glow, health, drop: drop24(c.history),
    watch, rapid, critical, witnesses, flagged, escalated, chip,
    dangerReady: witnesses >= REPORTS_FOR_DANGER || health === 'dying',
  }
}

export function evaluateAll(colonies: ColonyLike[], reports: ReportLike[]): ColonyEval[] {
  const counts = new Map<string, number>()
  for (const r of reports) if (!r.handled) counts.set(r.colonyId, (counts.get(r.colonyId) ?? 0) + 1)
  return colonies.map((c) => evaluateColony(c, counts.get(c.id) ?? 0))
}

const CHIP_ORDER: Record<Chip, number> = { ESCALATED: 0, CRITICAL: 1, WATCH: 2 }

/** Cases sorted ESCALATED, CRITICAL, WATCH; then lowest glow first. */
export function sortCases(evals: ColonyEval[]): ColonyEval[] {
  return evals
    .filter((e) => e.chip)
    .sort((a, b) => CHIP_ORDER[a.chip!] - CHIP_ORDER[b.chip!] || a.glow - b.glow)
}

/** The colony the pinned district pad declares on: the dimmest one somebody has actually seen something at. */
export function dangerCandidate(evals: ColonyEval[]): ColonyEval | null {
  return evals.filter((e) => e.witnesses >= REPORTS_FOR_DANGER).sort((a, b) => a.glow - b.glow)[0] ?? null
}
export const dangerPadActive = (evals: ColonyEval[]) => dangerCandidate(evals) !== null

/** Glow < 20% fires an automatic district alert. Raw WATCH data never does. */
export function criticalIds(evals: ColonyEval[]): string[] {
  return evals.filter((e) => e.glow < CRITICAL_BELOW).map((e) => e.id)
}

export function districtLevel(evals: ColonyEval[]): DistrictLevel {
  if (evals.some((e) => e.escalated)) return 'escalated'
  if (evals.some((e) => e.flagged)) return 'flagged'
  return 'calm'
}
