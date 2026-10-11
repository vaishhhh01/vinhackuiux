import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BandShell } from '../components/BandShell'
import { CitizenHome } from './CitizenHome'
import { ExpandedMap } from './ExpandedMap'
import { ColonyDetail } from './ColonyDetail'
import { SafeRoute } from './SafeRoute'
import { useStore } from '../state/store'

type Screen = 'home' | 'map'

/**
 * Thalassari band: HOME and the big water map (press a colony to report).
 * No swiping: every step is a big button. ALERT overrides everything and only an all-clear
 * or a deliberate hold on "I'm safe" closes it.
 */
export function CitizenBand() {
  const alert = useStore((s) => s.alert)
  const safe = useStore((s) => s.citizenSafe)
  const [screen, setScreen] = useState<Screen>('home')
  const [colonyId, setColonyId] = useState<string | null>(null)
  const prevAlert = useRef(alert)
  const showAlert = (alert === 'danger' && !safe) || alert === 'allClear'

  // all-clear closes the alert; the band returns Home
  useEffect(() => {
    if (prevAlert.current === 'allClear' && alert !== 'allClear') {
      setScreen('home')
      setColonyId(null)
    }
    prevAlert.current = alert
  }, [alert])

  return (
    <BandShell mode="citizen">
      <div className="relative h-full overflow-hidden">
        <CitizenHome onMap={() => setScreen('map')} />

        <AnimatePresence>
          {screen === 'map' && (
            <ExpandedMap key="map" onBack={() => setScreen('home')} onPick={setColonyId} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {colonyId && <ColonyDetail key={colonyId} colonyId={colonyId} onClose={() => setColonyId(null)} />}
        </AnimatePresence>

        <AnimatePresence>{showAlert && <SafeRoute key="alert" />}</AnimatePresence>
      </div>
    </BandShell>
  )
}
