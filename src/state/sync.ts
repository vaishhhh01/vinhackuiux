import { SYNC_KEYS, useStore } from './store'

/**
 * Real-time link between windows: open the Thalassari band in one tab and the Warden band in another,
 * and every report, flag, danger declaration and all-clear shows up in both within a frame.
 * UI-only state (which band is shown, selections) stays local.
 */
export function startSync(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const ch = new BroadcastChannel('lumen-thalassa')
  let remote = false
  // a freshly opened window stays silent until it has adopted a peer's state (or nobody answers),
  // otherwise its own default state would overwrite the live one
  let ready = false
  const readyTimer = setTimeout(() => { ready = true }, 600)
  const from = Math.random().toString(36).slice(2)

  const pick = () => {
    const s = useStore.getState() as unknown as Record<string, unknown>
    return Object.fromEntries(SYNC_KEYS.map((k) => [k, s[k]]))
  }
  const send = (type: 'state' | 'hello') =>
    ch.postMessage({ from, type, state: type === 'state' ? pick() : undefined })

  ch.onmessage = (e: MessageEvent) => {
    const m = e.data as { from: string; type: string; state?: Record<string, unknown> }
    if (!m || m.from === from) return
    if (m.type === 'hello') {
      send('state')
      return
    }
    if (m.type === 'state' && m.state) {
      ready = true
      remote = true
      try {
        useStore.getState().applyRemote(m.state)
      } finally {
        remote = false
      }
    }
  }

  const unsub = useStore.subscribe((state, prev) => {
    if (remote || !ready) return
    const a = state as unknown as Record<string, unknown>
    const b = prev as unknown as Record<string, unknown>
    if (SYNC_KEYS.some((k) => a[k] !== b[k])) send('state')
  })

  send('hello')
  return () => {
    clearTimeout(readyTimer)
    unsub()
    ch.close()
  }
}
