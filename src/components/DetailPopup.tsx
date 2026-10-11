import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** A soft pop-up card inside the band. Press outside it, or the round close button, to dismiss. */
export function DetailPopup({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  return (
    <motion.div
      className="absolute inset-0 z-30 grid place-items-center px-3"
      style={{ background: 'rgba(4,18,31,0.82)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-label={label}
    >
      <motion.div
        className="relative w-full"
        style={{
          padding: '16px 16px 18px',
          borderRadius: '40px 28px 40px 28px',
          background: 'linear-gradient(180deg, #1d475c, #0c2430)',
          border: '2px solid var(--warden-gold)',
          boxShadow: '0 0 40px rgba(255,233,168,0.25)',
        }}
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 16 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid place-items-center rounded-full"
          style={{ width: 56, height: 56, background: 'rgba(228,246,243,0.08)', border: '1.5px solid rgba(228,246,243,0.3)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth="3" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}
