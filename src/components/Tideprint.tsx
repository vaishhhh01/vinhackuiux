const HUES = ['#4de8d2', '#a1fff0', '#7fd8ff', '#9be7c4', '#8fe0ff', '#c4f0ff']

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * A unique ripple-print for each Thalassari, grown from their seed: a pearl in the middle,
 * a few broken tide rings, and a number of tiny droplets. Never a name, never a face.
 */
export function Tideprint({ seed, size = 40, glow = true }: { seed: number; size?: number; glow?: boolean }) {
  const r = rng(seed + 1)
  const rings = 3 + Math.floor(r() * 3)
  const hue = HUES[seed % HUES.length]
  const arcs = Array.from({ length: rings }, (_, i) => {
    const rad = 11 + i * (30 / rings) + 2
    const start = r() * 360
    const span = 120 + r() * 200
    const a0 = (start * Math.PI) / 180
    const a1 = ((start + span) * Math.PI) / 180
    const x0 = 50 + rad * Math.cos(a0), y0 = 50 + rad * Math.sin(a0)
    const x1 = 50 + rad * Math.cos(a1), y1 = 50 + rad * Math.sin(a1)
    return { d: `M ${x0} ${y0} A ${rad} ${rad} 0 ${span > 180 ? 1 : 0} 1 ${x1} ${y1}`, w: 3.2 + r() * 2.8 }
  })
  const drops = Array.from({ length: 2 + Math.floor(r() * 4) }, () => {
    const a = r() * Math.PI * 2
    const d = 14 + r() * 28
    return { x: 50 + d * Math.cos(a), y: 50 + d * Math.sin(a), s: 1.6 + r() * 2.2 }
  })
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={glow ? 'bloomf-sm' : ''}
      style={{ ['--c' as string]: hue }}
    >
      <circle cx="50" cy="50" r="46" fill="rgba(10,34,54,0.92)" stroke={hue} strokeOpacity="0.55" strokeWidth="2.5" />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={hue} strokeWidth={a.w} strokeLinecap="round" />
      ))}
      {drops.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={hue} opacity="0.85" />
      ))}
      <circle cx="50" cy="50" r="5.5" fill={hue} />
    </svg>
  )
}
