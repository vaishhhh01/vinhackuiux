/** Single source of truth for every LUMEN threshold. Values are % of a colony's OWN norm. */
export const WATCH_BELOW = 70
export const RAPID_DROP = 15 // points of norm lost within 24 h (strictly greater)
export const CRITICAL_BELOW = 20
export const DYING_BELOW = 35
/** one pair of eyes is enough for the Warden to call danger */
export const REPORTS_FOR_DANGER = 1
export const STALE_AFTER_MIN = 3

export type Health = 'healthy' | 'weak' | 'dying'

/** Redundantly-encoded health class used for dots, orbs and detail rows. */
export function healthOf(glow: number): Health {
  if (glow >= WATCH_BELOW) return 'healthy'
  if (glow >= DYING_BELOW) return 'weak'
  return 'dying'
}

/** 24 h history is ordered oldest -> newest and ends at the current glow. */
export function drop24(history: number[]): number {
  if (history.length < 2) return 0
  return Math.max(0, history[0] - history[history.length - 1])
}

export const isWatch = (glow: number) => glow < WATCH_BELOW
export const isRapid = (history: number[]) => drop24(history) > RAPID_DROP
export const isCritical = (glow: number) => glow < CRITICAL_BELOW

export function rhythmLabel(glow: number, history: number[]): string {
  if (isCritical(glow)) return 'failing'
  if (isRapid(history)) return 'rapidly declining'
  if (isWatch(glow) || drop24(history) > 5) return 'slowly declining'
  return 'steady'
}

/** Build a believable 12-sample (2-hourly) 24 h history that ends at `to`. */
export function fallingHistory(from: number, to: number, samples = 12): number[] {
  const out: number[] = []
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1)
    const eased = 1 - Math.pow(1 - t, 1.6)
    out.push(Math.round(from + (to - from) * eased))
  }
  out[samples - 1] = to
  return out
}
