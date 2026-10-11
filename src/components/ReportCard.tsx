import { motion } from 'framer-motion'
import { Tideprint } from './Tideprint'
import { minutesAgo } from '../hooks/useNow'
import { citizenById, type Colony, type Report } from '../state/store'

interface Props {
  report: Report
  destination?: Colony
  now: number
  onOpen: () => void
  onHandled: () => void
}

/** One eye. Press the middle to see who reported; press HANDLED on the side to send it away. */
export function ReportCard({ report, destination, now, onOpen, onHandled }: Props) {
  const who = citizenById(report.citizenId)
  return (
    <motion.li
      layout
      className="list-none overflow-hidden"
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 80, marginBottom: 8 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.92, transition: { duration: 0.3, ease: 'easeInOut' } }}
      transition={{ duration: 0.3 }}
      data-report={report.id}
    >
      <div className="flex h-[80px] gap-2">
        <motion.button
          type="button"
          onClick={onOpen}
          aria-label={`Eye from ${who.tideprintId}. Open details.`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          style={{ borderRadius: '30px 20px 30px 20px', paddingLeft: 10, background: 'rgba(255,233,168,0.06)', border: '1.5px solid rgba(255,233,168,0.4)' }}
          initial={{ boxShadow: '0 0 30px rgba(255,233,168,0.9)' }}
          animate={{ boxShadow: '0 0 0px rgba(255,233,168,0)' }}
          transition={{ duration: 2.6 }}
        >
          <Tideprint seed={report.tideprint} size={52} />
          <span className="min-w-0 flex-1">
            <span className="t-body block" style={{ fontSize: 17, lineHeight: 1.15 }}>{who.tideprintId}</span>
            <span className="t-body block" style={{ color: 'var(--text-70)', fontSize: 15, lineHeight: 1.15 }}>
              → {destination ? destination.name : 'nil'}
            </span>
            <span className="t-micro block" style={{ lineHeight: 1.2 }}>{minutesAgo(report.at, now)}</span>
          </span>
        </motion.button>
        <button
          type="button"
          onClick={onHandled}
          aria-label="Mark this eye handled"
          className="t-body grid shrink-0 place-items-center"
          style={{
            width: 80, borderRadius: '20px 30px 20px 30px', fontSize: 14,
            color: 'var(--warden-gold)', background: 'rgba(255,233,168,0.12)', border: '2px solid var(--warden-gold)',
          }}
        >
          HANDLED
        </button>
      </div>
    </motion.li>
  )
}
