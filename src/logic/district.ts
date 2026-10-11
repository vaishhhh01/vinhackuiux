import { MARK_MAX_LAYER, nodesInRadius, safeRoute, type GNode, type Graph, type Mark, type Route } from './routing'

export interface DistrictColony { id: string; name: string; x: number; y: number; glow: number }
export interface Waypoint extends GNode { name?: string }

/** A colony is a safe place to go to when it is still bright: >= 70% of its own norm. */
export const SAFE_GLOW = 70
/** Colonies this dim are treated as failed: never a destination and never a stepping stone. */
export const FAILED_GLOW = 35

const K_NEAREST = 3

const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The whole district as a graph: every colony, the Level 2 and Level 3 waypoints, the exit and the wearer.
 * Each node is linked to its nearest neighbours, so any colony can be a destination.
 */
export function buildDistrictGraph(
  colonies: DistrictColony[],
  at: { x: number; y: number },
  waypoints: Waypoint[],
  exit: GNode,
): Graph {
  const nodes: GNode[] = [
    { id: 'you', x: at.x, y: at.y, layer: 1, lit: true },
    ...colonies.map((c) => ({ id: c.id, x: c.x, y: c.y, layer: 1, lit: c.glow >= 50, colonyId: c.id })),
    ...waypoints.map((w) => ({ ...w })),
    { ...exit },
  ]
  const seen = new Set<string>()
  const edges: [string, string][] = []
  const link = (a: string, b: string) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`
    if (a === b || seen.has(k)) return
    seen.add(k)
    edges.push([a, b])
  }
  for (const n of nodes) {
    const near = nodes
      .filter((m) => m.id !== n.id)
      .sort((p, q) => d(n, p) - d(n, q))
      .slice(0, n.id === 'exit' ? 2 : K_NEAREST)
    for (const m of near) link(n.id, m.id)
  }
  // the deep shortcut is always one step away from the wearer (it is what the depth guard is demonstrated on)
  const s1 = nodes.find((n) => n.id === 's1')
  if (s1) link('you', 's1')
  // and one step from the nearest Level 2 water, for the rare day nothing on this level is left
  const up = nodes.filter((n) => n.layer === 2).sort((p, q) => d(at, p) - d(at, q))[0]
  if (up) link('you', up.id)
  return { nodes, edges }
}

export interface SafeTarget {
  kind: 'colony' | 'level'
  id: string
  label: string
  /** level number for kind === 'level' */
  level?: number
  route: Route
}

/**
 * Where to send somebody out of a danger zone:
 *  1. the NEAREST colony that is still bright, outside the zone, reached without leaving their Depth Mark;
 *  2. rare case, every colony has failed or is unreachable: the next level up (Level 2), if the mark allows it;
 *  3. otherwise nowhere (null): "no safe route, stay still".
 */
export function chooseSafeTarget(
  graph: Graph,
  colonies: DistrictColony[],
  danger: { x: number; y: number; id?: string },
  radius: number,
  mark: Mark,
): SafeTarget | null {
  const zone = nodesInRadius(graph, danger.x, danger.y, radius)
  zone.delete('you')
  // failed colonies are not stepping stones either
  for (const c of colonies) if (c.glow < FAILED_GLOW) zone.add(c.id)
  if (danger.id) zone.add(danger.id)

  let best: SafeTarget | null = null
  for (const c of colonies) {
    if (c.glow < SAFE_GLOW || zone.has(c.id)) continue
    const r = safeRoute(graph, 'you', c.id, mark, zone)
    if (r && (!best || r.cost < best.route.cost)) best = { kind: 'colony', id: c.id, label: c.name, route: r }
  }
  if (best) return best

  // rare: nothing nearby is left. Go up a level, if the Depth Mark lets you.
  if (MARK_MAX_LAYER[mark] >= 2) {
    for (const w of graph.nodes.filter((n) => n.layer === 2)) {
      const r = safeRoute(graph, 'you', w.id, mark, zone)
      if (r && (!best || r.cost < best.route.cost)) best = { kind: 'level', id: w.id, label: 'NEXT LEVEL · 2', level: 2, route: r }
    }
  }
  return best
}

/** A little wider than the dark zone itself, so people at its rim are told too. */
export const ALERT_MARGIN = 2

/**
 * Only the people standing in (or at the rim of) the affected area are told to move.
 * Everyone else keeps going about their day, with a calm notice.
 */
export function mustMove(at: { x: number; y: number }, danger: { x: number; y: number }, radius: number): boolean {
  return Math.hypot(at.x - danger.x, at.y - danger.y) <= radius + ALERT_MARGIN
}

/** A witness reports from where they stand. Roughly one colony's reach: your own, nothing further. */
export const REPORT_RANGE = 12

export function canReportFrom(at: { x: number; y: number }, colony: { x: number; y: number }): boolean {
  return Math.hypot(at.x - colony.x, at.y - colony.y) <= REPORT_RANGE
}
