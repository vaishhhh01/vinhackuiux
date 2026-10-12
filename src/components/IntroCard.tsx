import { motion, type Variants } from 'framer-motion'
import layers from '../data/layers.json'

export const PROBLEM_STATEMENT =
  'In THALASSA, Ilyri colonies provide light, safe navigation, and warnings for every layer. However, illegal harvesters are stealing Ilyri and damaging colonies. When colonies die, districts lose light, travel becomes dangerous, and citizens cannot report threats quickly enough. Citizens and Wardens need a shared system to monitor Ilyri health, report suspicious activity, and respond before a district goes dark.'

const STEPS: { who: string; what: string }[] = [
  { who: '1.', what: 'Choose a band: Thalassari, Warden or both' },
  { who: '2.', what: 'Press REPORT -> hold REPORT THEFT' },
  { who: '3.', what: 'Warden open Eye icon -> press an eye -> hold DANGER to alert everyone' },
  { who: '4.', what: 'Thalassians follow glowing route to Exit for safety' },
  { who: '5.', what: 'Press ALL CLEAR when the water is calm again.' },
]

const list: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } },
}

/** The arrow is drawn in, shaft first, then the head. */
const Arrow = () => (
  <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="mx-auto block">
    <motion.path
      d="M11 2v18M4 14l7 8 7-8" fill="none" stroke="var(--living-light)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
      variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } } }}
    />
  </svg>
)

/** About: the world in brief, then how to use the website, step by step. */
export function IntroCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section
      aria-labelledby="intro-title"
      className="rounded-[28px] p-5"
      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.85)', color: 'var(--text)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <h1 id="intro-title" className="t-brand" style={{ fontSize: 44, lineHeight: 1, color: 'var(--living-light)' }}>
          About
        </h1>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Close About"
          className="grid shrink-0 place-items-center rounded-full"
          style={{ width: 56, height: 56, border: '1px solid rgba(255,255,255,0.85)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>

      {open && (
        <motion.div className="mt-4 flex flex-col gap-6 text-[14px] leading-relaxed" variants={list} initial="hidden" animate="show">
          <motion.div variants={rise}>
            <h2 className="t-brand mb-2" style={{ fontSize: 30, color: 'var(--living-light)' }}>The world</h2>
            <p>
              THALASSA is made only of water. No land, no sky, no humans. Five levels sit one under another, joined by
              Currents: roads, food rivers, message networks and borders. Data rides the Currents as pulses, not Wi-Fi.
            </p>
            <ol className="mt-3 flex flex-col gap-1.5">
              {layers.layers.map((l) => (
                <li key={l.n} className="flex gap-2">
                  <span className="shrink-0 font-extrabold" style={{ color: 'var(--living-light)' }}>LEVEL {l.n} ·</span>
                  <span>{l.name} <span style={{ color: 'var(--text-70)' }}>({l.note})</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-3">
              At 12, every Thalassari takes the Depth Rite and receives a permanent Depth Mark and a Lumen Band. The mark
              limits how deep their body can go. Wardens, each bound to one level, carry the stronger Guard Band.
            </p>
          </motion.div>

          <motion.div variants={rise}>
            <h2 className="t-brand mb-3" style={{ fontSize: 30, color: 'var(--living-light)' }}>Working</h2>
            <motion.ol className="flex flex-col" data-testid="working-steps" variants={list}>
              {STEPS.map((s, i) => (
                <motion.li key={i} variants={rise}>
                  <div className="flex items-start gap-3">
                    <p>
                      <b style={{ color: 'var(--living-light)' }}>{s.who}.</b> {s.what}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="py-1" style={{ paddingLeft: 6 }}><Arrow /></div>
                  )}
                </motion.li>
              ))}
            </motion.ol>
          </motion.div>

          <motion.button
            variants={rise}
            type="button"
            onClick={onToggle}
            className="t-body w-full rounded-full"
            style={{ height: 64, fontSize: 18, letterSpacing: '0.18em', border: '1px solid rgba(255,255,255,0.85)' }}
          >
            CLOSE
          </motion.button>
        </motion.div>
      )}
    </section>
  )
}
