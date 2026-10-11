# LUMEN · THALASSA band prototype

A website prototype of **LUMEN**, the wristband app of the water world THALASSA. Two bands share one live world:
the **Thalassari band** (citizens) and the **Warden band** (Guard Band).

React 18 + TypeScript + Vite, Tailwind (tokens in `src/styles/tokens.css`), Framer Motion, Zustand, XState v5,
Dexie (IndexedDB offline queue), Workbox PWA, Vitest.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pure logic: escalation, depth-safe router, patrol, alert machine
npm run build    # type-check + production build + service worker (Vercel-ready)
```

## Using the site

1. On every load the page is veiled in gray and only the **About** button pulses. Open About, read it, close it.
2. **Left side**
   - **Thalassari / Warden / Both**: choose a band, or see both side by side.
   - **Wearing**: six Thalassari, each with their own Tideprint, Tideprint ID and place on the map.
     Naela and Oriel share a colony; the rest are elsewhere.
   - **Pulses**: key to the alert flashes. **The Current**: Cut / Weak / Strong signal.
3. **Right side, SIMULATION**: makes things happen in the world (someone reports, a colony fades, a colony
   goes dark, shortcut test, reset).
4. **Real time**: both bands read one store, and separate browser windows are linked through a
   `BroadcastChannel`, so a Thalassari report in one window shows up in a Warden window.

## The bands

**Thalassari** (no swiping, everything is a big button)
- Home: Tideprint, ID, Depth Mark, five-level ladder, mini map, **REPORT**.
- Press the map or REPORT, press the colony you are near, then **hold REPORT THEFT** (1 s).
  An optional "where are they going?" card follows and fades on its own.
- Danger: red alert with the dark zone and a route that never leaves the wearer's Depth Mark.
  The red pulse plays twice, then the map grows. Hold **I'M SAFE** to close it, or wait for ALL CLEAR.

**Warden**
- Map of the district, then **Cases** (what the sensors flagged) and **Eyes** (what Thalassari reported).
- Press a case or an eye for details. **HANDLED** sits on the side of every row.
- An eye's popup has the reporter's Tideprint ID, where they saw it, where the thief is heading (or `nil`),
  plus **PATROL** and a hold-to-declare **DANGER**. One eye is enough, and a red colony can be declared directly.
- The pinned pad declares district danger; **ALL CLEAR** sends everyone home.

## Signal and the Current

The Current is the water network data travels on. The thin edge of each band shows it:
steady cyan (strong), flickering (weak), gray dashes (cut). While cut, reports and declarations are saved in
IndexedDB and sent when it returns. Browser online/offline events drive the same states.

## Where the rules live

| Rule | File |
| --- | --- |
| WATCH < 70 %, rapid decline > 15 pts / 24 h, CRITICAL < 20 %, 1 eye for danger | `src/logic/thresholds.ts`, `src/logic/escalation.ts` |
| Router never emits a layer deeper than the Depth Mark | `src/logic/routing.ts` (`safeRoute`), tests in `src/logic/logic.test.ts` |
| calm → flagged → escalated → danger → allClear | `src/state/alertMachine.ts` |
| Offline queue | `src/state/queue.ts` (Dexie), flushed in `src/state/store.ts` |
| Cross-window live sync | `src/state/sync.ts` |
| Press-and-hold (1000 ms, pressure-aware, keyboard) | `src/components/PressureButton.tsx` |
| Pulse patterns + Vibration API | `src/components/PulseHaptics.ts`, `src/components/AlertPulse.tsx` |

## Notes

- Map space is 100 × 66 units, drawn at 328 × 216 px (Warden) and zoomed views on the Thalassari side.
- The "Current silent · N min ago" counter is demo time (1 minute per 6 s, starting at 4).
- The **Lumen** wordmark and the page headings use **Caprasimo** (SIL Open Font License), loaded from Google Fonts and
  cached by the service worker. Body text is Nunito and Fredoka, also OFL.
