import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import layers from '../data/layers.json'
import colonies from '../data/colonies.json'
import { alertMachine } from '../state/alertMachine'
import {
  criticalIds, dangerCandidate, dangerPadActive, districtLevel, evaluateAll, evaluateColony, sortCases,
} from './escalation'
import {
  MARKS, MARK_MAX_LAYER, findRoute, firstViolation, naiveShortcut, nodesInRadius, planPatrol, routeFitsMark,
  safeRoute, type Graph, type GNode,
} from './routing'
import { drop24, fallingHistory, healthOf } from './thresholds'

const flat = (v: number) => Array(12).fill(v) as number[]
const col = (id: string, glow: number, history = flat(glow)) => ({ id, glow, history })

describe('thresholds', () => {
  it('WATCH is strictly below 70% of own norm', () => {
    expect(evaluateColony(col('a', 70), 0).watch).toBe(false)
    expect(evaluateColony(col('a', 69), 0).watch).toBe(true)
  })
  it('rapid decline is strictly more than 15 in 24h', () => {
    const h = (from: number, to: number) => fallingHistory(from, to)
    expect(evaluateColony(col('a', 85, h(100, 85)), 0).rapid).toBe(false) // exactly 15
    expect(evaluateColony(col('a', 84, h(100, 84)), 0).rapid).toBe(true)
  })
  it('CRITICAL is strictly below 20%', () => {
    expect(evaluateColony(col('a', 20), 0).critical).toBe(false)
    expect(evaluateColony(col('a', 19), 0).critical).toBe(true)
  })
  it('health classes', () => {
    expect([90, 50, 10].map(healthOf)).toEqual(['healthy', 'weak', 'dying'])
  })
  it('fallingHistory ends on target and drop24 matches', () => {
    const h = fallingHistory(88, 42)
    expect(h[h.length - 1]).toBe(42)
    expect(drop24(h)).toBe(46)
  })
})

describe('escalation', () => {
  const dropped = col('g', 42, fallingHistory(88, 42))
  it('a witness report on a flagged colony escalates it', () => {
    const e = evaluateColony(dropped, 1)
    expect(e.chip).toBe('ESCALATED')
    expect(e.dangerReady).toBe(true) // one eye is enough
  })
  it('a witness makes a case even on a colony the sensors call healthy', () => {
    expect(evaluateColony(col('h', 90), 1).chip).toBe('ESCALATED')
    expect(evaluateColony(col('h', 90), 0).chip).toBeNull()
  })
  it('danger pad wakes with a single witness, never on sensors alone', () => {
    expect(dangerPadActive([evaluateColony(dropped, 0)])).toBe(false)
    expect(dangerPadActive([evaluateColony(dropped, 1)])).toBe(true)
  })
  it('a red jellyfish can be declared on even with nobody watching', () => {
    expect(evaluateColony(col('r', 27), 0).dangerReady).toBe(true)
    expect(evaluateColony(col('ok', 90), 0).dangerReady).toBe(false)
    expect(dangerPadActive([evaluateColony(col('r', 27), 0)])).toBe(false)
  })
  it('handled reports no longer count', () => {
    const evals = evaluateAll([dropped], [
      { colonyId: 'g' }, { colonyId: 'g', handled: true },
    ])
    expect(evals[0].witnesses).toBe(1)
  })
  it('sorts ESCALATED, CRITICAL, WATCH', () => {
    const evals = evaluateAll(
      [col('watch', 60), col('crit', 15), col('esc', 50, fallingHistory(90, 50))],
      [{ colonyId: 'esc' }],
    )
    expect(sortCases(evals).map((e) => e.chip)).toEqual(['ESCALATED', 'CRITICAL', 'WATCH'])
  })
  it('raw sensor flags alone never alert citizens; only glow < 20 does', () => {
    const evals = evaluateAll([col('a', 30, fallingHistory(80, 30)), col('b', 25)], [])
    expect(criticalIds(evals)).toEqual([])
    expect(criticalIds(evaluateAll([col('a', 19)], []))).toEqual(['a'])
    expect(dangerCandidate(evals)).toBeNull()
  })
  it('district level', () => {
    expect(districtLevel(evaluateAll([col('a', 90)], []))).toBe('calm')
    expect(districtLevel(evaluateAll([col('a', 60)], []))).toBe('flagged')
    expect(districtLevel(evaluateAll([col('a', 60)], [{ colonyId: 'a' }]))).toBe('escalated')
  })
  it('mock data starts quiet for citizens', () => {
    const evals = evaluateAll(colonies as never, [])
    expect(criticalIds(evals)).toEqual([])
    expect(evals.find((e) => e.id === 'garden-3')!.chip).toBeNull()
  })
})

describe('depth-safe router', () => {
  const graph = layers.graph as unknown as Graph
  const dark = nodesInRadius(graph, 50, 38, layers.dangerRadius)

  it('a depth-blind shortcut dips into Level 3 (the demo premise)', () => {
    const r = naiveShortcut(graph, 'you', 'exit')!
    expect(r.deepest).toBe(3)
    expect(firstViolation(r, MARK_MAX_LAYER.middle)).toBeGreaterThan(0)
  })

  it('never outputs a layer deeper than the Depth Mark, for every mark and every start', () => {
    for (const mark of MARKS) {
      for (const n of graph.nodes) {
        for (const avoid of [new Set<string>(), dark]) {
          const r = safeRoute(graph, n.id, 'exit', mark, avoid)
          if (r) {
            expect(r.deepest).toBeLessThanOrEqual(MARK_MAX_LAYER[mark])
            expect(routeFitsMark(r, mark)).toBe(true)
          }
        }
      }
    }
  })

  it('Middle mark reroutes through levels 1-2 and is longer than the shortcut', () => {
    const naive = naiveShortcut(graph, 'you', 'exit')!
    const r = safeRoute(graph, 'you', 'exit', 'middle', dark)!
    expect(r.deepest).toBeLessThanOrEqual(2)
    expect(r.length).toBeGreaterThan(naive.length)
  })

  it('Shallow mark never uses Level 2', () => {
    const r = safeRoute(graph, 'you', 'exit', 'shallow', dark)!
    expect(r.points.every((p) => p.layer === 1)).toBe(true)
  })

  it('Deep mark may use Level 3 when nothing else is cheaper (no avoid, no lit bias)', () => {
    const r = findRoute(graph, 'you', 'exit', { maxLayer: 3 })!
    expect(r.deepest).toBe(3)
  })

  it('returns null (rare blocked state) rather than a violating route', () => {
    const g: Graph = {
      nodes: [
        { id: 'a', x: 0, y: 0, layer: 1 }, { id: 'deep', x: 5, y: 5, layer: 3 }, { id: 'z', x: 10, y: 10, layer: 1 },
      ] as GNode[],
      edges: [['a', 'deep'], ['deep', 'z']],
    }
    expect(safeRoute(g, 'a', 'z', 'middle')).toBeNull()
    expect(safeRoute(g, 'a', 'z', 'deep')).not.toBeNull()
  })

  it('randomised graphs: output never violates the mark', () => {
    let seed = 7
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    for (let t = 0; t < 200; t++) {
      const nodes: GNode[] = Array.from({ length: 12 }, (_, i) => ({
        id: `n${i}`, x: rnd() * 100, y: rnd() * 100, layer: 1 + Math.floor(rnd() * 5), lit: rnd() > 0.3,
      }))
      const edges: [string, string][] = []
      for (let i = 0; i < 24; i++) edges.push([`n${Math.floor(rnd() * 12)}`, `n${Math.floor(rnd() * 12)}`])
      for (const mark of MARKS) {
        const r = safeRoute({ nodes, edges }, 'n0', 'n11', mark)
        if (r) expect(r.points.every((p) => p.layer <= MARK_MAX_LAYER[mark])).toBe(true)
      }
    }
  })
})

describe('patrol', () => {
  it('visits every stop once and returns to start, faster on Current flow', () => {
    const start = { x: 52, y: 60 }
    const stops = [
      { id: 'a', x: 50, y: 38 }, { id: 'b', x: 88, y: 26 }, { id: 'c', x: 16, y: 12 },
    ]
    const p = planPatrol(start, stops, layers.currents as number[][][])
    expect(p.order.map((s) => s.id).sort()).toEqual(['a', 'b', 'c'])
    expect(p.legs).toHaveLength(4)
    expect(p.minutes).toBeGreaterThan(0)
    const noCurrent = planPatrol(start, stops, [])
    expect(p.minutes).toBeLessThanOrEqual(noCurrent.minutes)
  })
})

describe('alert state machine', () => {
  const run = (...events: Parameters<ReturnType<typeof createActor<typeof alertMachine>>['send']>[0][]) => {
    const a = createActor(alertMachine).start()
    events.forEach((e) => a.send(e))
    const v = a.getSnapshot().value
    a.stop()
    return v
  }
  it('calm -> flagged -> escalated -> danger -> allClear', () => {
    expect(run({ type: 'SYNC', level: 'flagged' })).toBe('flagged')
    expect(run({ type: 'SYNC', level: 'flagged' }, { type: 'SYNC', level: 'escalated' })).toBe('escalated')
    expect(run({ type: 'SYNC', level: 'escalated' }, { type: 'DECLARE' })).toBe('danger')
    expect(run({ type: 'DECLARE' }, { type: 'PROTECT' })).toBe('allClear')
  })
  it('sensor sync can never enter or leave danger', () => {
    expect(run({ type: 'DECLARE' }, { type: 'SYNC', level: 'calm' })).toBe('danger')
    expect(run({ type: 'SYNC', level: 'escalated' })).not.toBe('danger')
  })
  it('auto critical enters danger', () => {
    expect(run({ type: 'AUTO_CRITICAL' })).toBe('danger')
  })
})
