import Dexie, { type Table } from 'dexie'

export interface QueueItem {
  id: string
  kind: 'report' | 'declare'
  payload: Record<string, unknown>
  createdAt: number
}

class LumenDB extends Dexie {
  queue!: Table<QueueItem, string>
  constructor() {
    super('lumen-offline')
    this.version(1).stores({ queue: 'id, kind, createdAt' })
  }
}

let db: LumenDB | null = null
const getDb = () => {
  if (db) return db
  try {
    db = new LumenDB()
  } catch {
    db = null
  }
  return db
}

/** Every call is best-effort: the in-memory queue in the store is the source of truth at runtime. */
export const offlineQueue = {
  async put(item: QueueItem) {
    try { await getDb()?.queue.put(item) } catch { /* private mode etc. */ }
  },
  async remove(id: string) {
    try { await getDb()?.queue.delete(id) } catch { /* ignore */ }
  },
  async clear() {
    try { await getDb()?.queue.clear() } catch { /* ignore */ }
  },
  async all(): Promise<QueueItem[]> {
    try { return (await getDb()?.queue.orderBy('createdAt').toArray()) ?? [] } catch { return [] }
  },
}
