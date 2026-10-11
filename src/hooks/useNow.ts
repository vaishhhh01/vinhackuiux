import { useEffect, useState } from 'react'
import { useStore } from '../state/store'

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** Demo-time minutes since the Current went silent: starts at 4 and ticks up every 6 s. */
export function useLostAge(): number | null {
  const lostAt = useStore((s) => s.lostAt)
  const now = useNow(1000)
  if (lostAt == null) return null
  return 4 + Math.floor(Math.max(0, now - lostAt) / 6000)
}

export function minutesAgo(at: number, now: number): string {
  const m = Math.max(0, Math.round((now - at) / 60000))
  return m <= 0 ? 'just now' : `${m} min ago`
}
