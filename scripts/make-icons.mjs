// Dependency-free PNG writer: radial "Ilyri glow" on abyss.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
function png(n) {
  const raw = Buffer.alloc((n * 3 + 1) * n)
  for (let y = 0; y < n; y++) {
    raw[y * (n * 3 + 1)] = 0
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2, y - n / 2) / (n / 2)
      const g = Math.max(0, 1 - d / 0.8)
      const core = Math.max(0, 1 - d / 0.3)
      const i = y * (n * 3 + 1) + 1 + x * 3
      raw[i] = Math.min(255, 4 + 77 * g * g + 170 * core)
      raw[i + 1] = Math.min(255, 18 + 214 * g * g + 25 * core)
      raw[i + 2] = Math.min(255, 31 + 180 * g * g + 30 * core)
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
