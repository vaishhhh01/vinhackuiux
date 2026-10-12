import { useEffect, useRef } from 'react'

/**
 * WaterRipple: a port of the Framer "Water Ripple Image" effect. Hover and click spawn expanding rings
 * that displace a water texture and add a bright highlight along the crest, in a WebGL shader.
 *
 * Used only by WaterView.tsx. It cannot bend the live DOM, so it paints the rippling water as a
 * translucent layer over (or behind) the UI. Pointer events are read from the window, so the canvas
 * itself never blocks a tap. Delete this file together with WaterView.tsx to remove the effect.
 */

const MAX_RIPPLES = 18
const HOVER_THROTTLE_MS = 70
const CLICK_SPEED_MULT = 0.85
const FREQUENCY_CONSTANT = 512
const CREST: [number, number, number] = [0.55, 0.85, 0.82]

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_rippleCount;
uniform vec2 u_origin[${MAX_RIPPLES}];
uniform float u_start[${MAX_RIPPLES}];
uniform float u_strength[${MAX_RIPPLES}];
uniform float u_speed[${MAX_RIPPLES}];
uniform float u_decay[${MAX_RIPPLES}];
uniform float u_frequency;
uniform vec3 u_highlight;

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 displacement = vec2(0.0);
  float highlight = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= u_rippleCount) break;
    float age = u_time - u_start[i];
    if (age < 0.0) continue;
    vec2 diff = uv - u_origin[i];
    diff.x *= aspect;
    float dist = length(diff);
    vec2 dir = dist > 0.0001 ? diff / dist : vec2(0.0);
    float radius = age * u_speed[i];
    float ringWidth = 0.045 + radius * 0.35;
    float envelope = exp(-pow((dist - radius) / ringWidth, 2.0));
    float ageFade = exp(-age * u_decay[i]);
    float wave = sin((dist - radius) * u_frequency) * envelope * ageFade * u_strength[i];
    displacement += dir * wave;
    highlight += wave;
  }
  vec2 sampleUV = clamp(uv + displacement, 0.0, 1.0);
  vec4 color = texture2D(u_image, sampleUV);
  color.rgb += highlight * u_highlight;
  // the crest is visible even where the water texture is thin
  color.a = clamp(color.a + abs(highlight) * 1.6, 0.0, 1.0);
  gl_FragColor = color;
}`

/** The "image": soft teal depth with bright caustic blobs, drawn once on a small canvas. */
function makeWaterTexture(variant: 'band' | 'page'): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const base = g.createLinearGradient(0, 0, 0, 512)
  if (variant === 'page') {
    base.addColorStop(0, 'rgba(24,120,150,0.22)')
    base.addColorStop(1, 'rgba(4,28,50,0.3)')
  } else {
    base.addColorStop(0, 'rgba(30,140,165,0.30)')
    base.addColorStop(1, 'rgba(6,50,84,0.38)')
  }
  g.fillStyle = base
  g.fillRect(0, 0, 512, 512)
  // deterministic scatter so it looks the same on every load
  let seed = variant === 'page' ? 7 : 19
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  // the page keeps soft light pools; inside a band there are only fine light lines, so the UI stays crisp
  for (let i = 0; i < (variant === 'page' ? 24 : 0); i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 14 + rnd() * 46
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `rgba(190,255,245,${0.07 + rnd() * 0.08})`)
    rg.addColorStop(1, 'rgba(190,255,245,0)')
    g.fillStyle = rg
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  }
  g.strokeStyle = variant === 'band' ? 'rgba(190,255,245,0.22)' : 'rgba(190,255,245,0.14)'
  g.lineWidth = variant === 'band' ? 1.5 : 2
  for (let i = 0; i < (variant === 'band' ? 22 : 14); i++) {
    const y = rnd() * 512
    g.beginPath(); g.moveTo(0, y)
    g.bezierCurveTo(150, y + (rnd() - 0.5) * 60, 330, y + (rnd() - 0.5) * 60, 512, y + (rnd() - 0.5) * 40)
    g.stroke()
  }
  return c
}

interface Ripple { x: number; y: number; start: number; strength: number; speed: number; decay: number }

interface Props {
  variant: 'band' | 'page'
  hoverStrength?: number
  clickStrength?: number
  rippleSpeed?: number
  rippleSize?: number
  hoverFade?: number
  clickFade?: number
  /** premultiplied crest colour */
  highlight?: [number, number, number]
  className?: string
  style?: React.CSSProperties
}

export function WaterRipple({
  variant, hoverStrength = 0.022, clickStrength = 0.07, rippleSpeed = 0.9, rippleSize = 16,
  hoverFade = 0.6, clickFade = 1.8, highlight = CREST, className, style,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vs || !fs) return
    const program = gl.createProgram()!
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeWaterTexture(variant))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const u = (n: string) => gl.getUniformLocation(program, n)
    const U = {
      image: u('u_image'), res: u('u_resolution'), time: u('u_time'), count: u('u_rippleCount'),
      freq: u('u_frequency'), hi: u('u_highlight'),
      origin: u('u_origin[0]'), start: u('u_start[0]'), strength: u('u_strength[0]'), speed: u('u_speed[0]'), decay: u('u_decay[0]'),
    }
    const origin = new Float32Array(MAX_RIPPLES * 2)
    const start = new Float32Array(MAX_RIPPLES)
    const strength = new Float32Array(MAX_RIPPLES)
    const speed = new Float32Array(MAX_RIPPLES)
    const decay = new Float32Array(MAX_RIPPLES)
    const hoverDecay = Math.log(50) / Math.max(0.05, hoverFade)
    const clickDecay = Math.log(50) / Math.max(0.05, clickFade)
    const maxLife = Math.max(hoverFade, clickFade) * 2.2
    const t0 = performance.now()
    let ripples: Ripple[] = []
    let raf: number | null = null
    let lastHover = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    }
    const draw = () => {
      resize()
      const t = (performance.now() - t0) / 1000
      ripples = ripples.filter((r) => t - r.start < maxLife)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(U.image, 0)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.time, t)
      gl.uniform1f(U.freq, FREQUENCY_CONSTANT / Math.max(1, rippleSize))
      gl.uniform3f(U.hi, highlight[0], highlight[1], highlight[2])
      origin.fill(0); start.fill(-1e3); strength.fill(0); speed.fill(0); decay.fill(0)
      const n = Math.min(ripples.length, MAX_RIPPLES)
      for (let i = 0; i < n; i++) {
        const r = ripples[i]
        origin[i * 2] = r.x; origin[i * 2 + 1] = r.y
        start[i] = r.start; strength[i] = r.strength; speed[i] = r.speed; decay[i] = r.decay
      }
      gl.uniform1i(U.count, n)
      gl.uniform2fv(U.origin, origin)
      gl.uniform1fv(U.start, start)
      gl.uniform1fv(U.strength, strength)
      gl.uniform1fv(U.speed, speed)
      gl.uniform1fv(U.decay, decay)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    const loop = () => {
      draw()
      raf = ripples.length ? requestAnimationFrame(loop) : null
    }
    const add = (x: number, y: number, s: number, speedMult: number, d: number) => {
      if (ripples.length >= MAX_RIPPLES) ripples.shift()
      ripples.push({ x, y, start: (performance.now() - t0) / 1000, strength: s, speed: rippleSpeed * speedMult, decay: d })
      if (raf === null) raf = requestAnimationFrame(loop)
    }
    // the canvas never takes pointer events: the window is listened to, and only hits inside it count
    const toUV = (e: PointerEvent): [number, number] | null => {
      const r = canvas.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]
    }
    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      if (now - lastHover < HOVER_THROTTLE_MS) return
      const p = toUV(e); if (!p) return
      lastHover = now
      add(p[0], p[1], hoverStrength, 1, hoverDecay)
    }
    const onDown = (e: PointerEvent) => {
      const p = toUV(e); if (!p) return
      add(p[0], p[1], clickStrength, CLICK_SPEED_MULT, clickDecay)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    draw()

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      if (raf !== null) cancelAnimationFrame(raf)
      gl.deleteTexture(tex); gl.deleteProgram(program); gl.deleteBuffer(buf)
    }
  }, [variant, hoverStrength, clickStrength, rippleSpeed, rippleSize, hoverFade, clickFade, highlight])

  return <canvas ref={ref} className={className} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', ...style }} aria-hidden="true" />
}
