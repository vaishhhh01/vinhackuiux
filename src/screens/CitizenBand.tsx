import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BandShell } from '../components/BandShell'
import { CitizenHome } from './CitizenHome'
import { ColonyDetail } from './ColonyDetail'
import { SafeRoute } from './SafeRoute'
import { citizenById, useMustMove, useStore } from '../state/store'

/**
 * Thalassari band: HOME, and from REPORT straight to the colony you are standing at.
 * No swiping: every step is a big button. ALERT overrides everything and only an all-clear
 * or a deliberate hold on "I'm safe" closes it.
 */
export function CitizenBand() {
  const alert = useStore((s) => s.alert)
  const safe = useStore((s) => s.safeCitizens.includes(s.citizenId))
  const me = citizenById(useStore((s) => s.citizenId))
  const [colonyId, setColonyId] = useState<string | null>(null)
  const prevAlert = useRef(alert)
  const { affected } = useMustMove()
  // the takeover is only for people in the affected area; everyone else just gets a calm notice on Home
  const showAlert = affected && ((alert === 'danger' && !safe) || alert === 'allClear')

  // a different wearer starts on Home, never inside someone else's report page
  useEffect(() => { setColonyId(null) }, [me.id])

  // all-clear closes the alert; the band returns Home
  useEffect(() => {
    if (prevAlert.current === 'allClear' && alert !== 'allClear') {
      setColonyId(null)
    }
    prevAlert.current = alert
  }, [alert])

  return (
    <BandShell mode="citizen">
      <div className="relative h-full overflow-hidden">
        <CitizenHome onReport={() => setColonyId(me.colonyId)} />

        <AnimatePresence>
          {colonyId && <ColonyDetail key={colonyId} colonyId={colonyId} onClose={() => setColonyId(null)} />}
        </AnimatePresence>

        <AnimatePresence>{showAlert && <SafeRoute key="alert" />}</AnimatePresence>
      </div>
    </BandShell>
  )
}
