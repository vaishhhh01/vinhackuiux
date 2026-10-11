export type Mark = 'shallow' | 'middle' | 'deep' | 'hollow'
export const MARK_MAX_LAYER: Record<Mark, number> = { shallow: 1, middle: 2, deep: 3, hollow: 4 }
export const MARKS: Mark[] = ['shallow', 'middle', 'deep', 'hollow']

export interface GNode { id: string; x: number; y: number; layer: number; lit?: boolean; colonyId?: string }
export interface Graph { nodes: GNode[]; edges: [string, string][] }
export interface RouteOpts {
  /** Hard ceiling: nodes deeper than this are never entered. */
  maxLayer: number
  avoid?: Set<string>
  /** Prefer lit colonies (cheaper edges). */
  litBias?: boolean
}
export interface Route { ids: string[]; points: GNode[]; length: number; cost: number; deepest: number }

const dist = (a: GNode, b: GNode) => Math.hypot(a.x - b.x, a.y - b.y)

/** Dijkstra over the layer graph. Edges touching a too-deep or avoided node do not exist. */
export function findRoute(g: Graph, from: string, to: string, o: RouteOpts): Route | null {
  const byId = new Map(g.nodes.map((n) => [n.id, n]))
  const start = byId.get(from), goal = byId.get(to)
  if (!start || !goal) return null
  const usable = (n: GNode) => n.layer <= o.maxLayer && (n.id === from || !o.avoid?.has(n.id))
  if (!usable(start) || !usable(goal)) return null
  const adj = new Map<string, string[]>()
  for (const [a, b] of g.edges) {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b); adj.get(b)!.push(a)
  }
  const cost = new Map<string, number>([[from, 0]])
  const prev = new Map<string, string>()
  const open = new Set<string>([from])
  const done = new Set<string>()
  while (open.size) {
    let cur = '', best = Infinity
    for (const id of open) if ((cost.get(id) ?? Infinity) < best) { best = cost.get(id)!; cur = id }
    open.delete(cur); done.add(cur)
    if (cur === to) break
    const cn = byId.get(cur)!
    for (const nid of adj.get(cur) ?? []) {
      const nn = byId.get(nid)
      if (!nn || done.has(nid) || !usable(nn)) continue
      const lit = cn.lit !== false && nn.lit !== false
      const w = dist(cn, nn) * (o.litBias ? (lit ? 0.8 : 1.4) : 1)
      const c = best + w
      if (c < (cost.get(nid) ?? Infinity)) { cost.set(nid, c); prev.set(nid, cur); open.add(nid) }
    }
  }
  if (!done.has(to)) return null
  const ids = [to]
  while (ids[0] !== from) ids.unshift(prev.get(ids[0])!)
  const points = ids.map((id) => byId.get(id)!)
  let length = 0
  for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i])
  return { ids, points, length, cost: cost.get(to)!, deepest: Math.max(...points.map((p) => p.layer)) }
}

export const routeFitsMark = (r: Route, mark: Mark) => r.points.every((p) => p.layer <= MARK_MAX_LAYER[mark])

/** Index of the first node deeper than maxLayer, or -1. */
export function firstViolation(r: Route, maxLayer: number): number {
  return r.points.findIndex((p) => p.layer > maxLayer)
}

/**
 * The only function the UI uses to obtain an evacuation route.
 * Guarantee: never returns a route containing a layer deeper than the Depth Mark (null instead).
 */
export function safeRoute(g: Graph, from: string, to: string, mark: Mark, avoid: Set<string> = new Set()): Route | null {
  const r = findRoute(g, from, to, { maxLayer: MARK_MAX_LAYER[mark], avoid, litBias: true })
  return r && routeFitsMark(r, mark) ? r : null
}

/** What a depth-blind router would draw: shortest line through any layer. Used only for the guard demo. */
export function naiveShortcut(g: Graph, from: string, to: string): Route | null {
  return findRoute(g, from, to, { maxLayer: 5, litBias: false })
}

export function nodesInRadius(g: Graph, cx: number, cy: number, r: number): Set<string> {
  return new Set(g.nodes.filter((n) => Math.hypot(n.x - cx, n.y - cy) < r).map((n) => n.id))
}

/* ---------------- Warden patrol ---------------- */

export interface Pt { x: number; y: number }
export interface Stop extends Pt { id: string }
export interface PatrolLeg { from: Pt; to: Pt; length: number; minutes: number; onCurrent: boolean }
export interface Patrol { order: Stop[]; legs: PatrolLeg[]; minutes: number }

const MIN_PER_UNIT = 0.12
const CURRENT_FACTOR = 0.55

function nearCurrent(p: Pt, line: number[][]): boolean {
  return line.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < 7)
}
function ridesCurrent(a: Pt, b: Pt, currents: number[][][]): boolean {
  return currents.some((c) => nearCurrent(a, c) && nearCurrent(b, c))
}

function permutations<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a]
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]))
}

/** Optimal loop start -> stops -> start. Exhaustive (<= 6 stops); legs riding Current flow are faster. */
export function planPatrol(start: Pt, stops: Stop[], currents: number[][][]): Patrol {
  const s = stops.slice(0, 6)
  const leg = (a: Pt, b: Pt) => {
    const len = Math.hypot(a.x - b.x, a.y - b.y)
    const on = ridesCurrent(a, b, currents)
    return { len, on, min: len * MIN_PER_UNIT * (on ? CURRENT_FACTOR : 1) }
  }
  let best: { order: Stop[]; total: number } | null = null
  for (const perm of permutations(s)) {
    let total = 0
    let cur: Pt = start
    for (const st of perm) { total += leg(cur, st).min; cur = st }
    total += leg(cur, start).min
    if (!best || total < best.total) best = { order: perm, total }
  }
  const order = best?.order ?? []
  const legs: PatrolLeg[] = []
  let cur: Pt = start
  for (const st of [...order, start]) {
    const l = leg(cur, st)
    legs.push({ from: cur, to: st, length: l.len, minutes: l.min, onCurrent: l.on })
    cur = st
  }
  return { order, legs, minutes: Math.max(1, Math.round(legs.reduce((a, l) => a + l.minutes, 0))) }
}
