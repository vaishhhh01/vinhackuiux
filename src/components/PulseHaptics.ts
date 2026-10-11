export type PulseKind = 'info' | 'caution' | 'danger' | 'allClear' | 'warden'

/** Vibration patterns (ms). Odd entries are pauses. Danger repeats until stopped. */
export const PATTERNS: Record<PulseKind, number[]> = {
  info: [60],
  caution: [120, 160, 120],
  danger: [80, 60, 80, 400],
  allClear: [500],
  warden: [250],
}

export const PULSE_COLOR: Record<PulseKind, string> = {
  info: 'var(--calm-blue)',
  caution: 'var(--glow-amber)',
  danger: 'var(--glow-red)',
  allClear: 'var(--calm-blue)',
  warden: 'var(--warden-gold)',
}

let loop: ReturnType<typeof setTimeout> | null = null

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
const total = (p: number[]) => p.reduce((a, b) => a + b, 0)

export const PulseHaptics = {
  /** Plays a pattern; falls back silently to visuals-only when the Vibration API is missing. */
  play(kind: PulseKind) {
    this.stop()
    if (!canVibrate()) return false
    const p = PATTERNS[kind]
    try {
      navigator.vibrate(p)
      if (kind === 'danger') {
        // exactly one repeat: two red pulses in total
        loop = setTimeout(() => { navigator.vibrate(p); loop = null }, total(p) + 200)
      }
    } catch {
      return false
    }
    return true
  },
  stop() {
    if (loop) clearTimeout(loop)
    loop = null
    if (canVibrate()) {
      try { navigator.vibrate(0) } catch { /* visuals only */ }
    }
  },
  /** Light tick used by press-and-hold ("rising haptic"). */
  tick(strength = 10) {
    if (canVibrate()) {
      try { navigator.vibrate(strength) } catch { /* ignore */ }
    }
  },
}
