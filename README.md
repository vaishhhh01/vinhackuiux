# LUMEN · THALASSA band prototype

A website prototype of **LUMEN**, the wristband app of the water world THALASSA. Two bands share one live world:
the **Thalassari band** (citizens) and the **Warden band** (Guard Band).

React 18 + TypeScript + Vite, Tailwind (tokens in `src/styles/tokens.css`), Framer Motion, Zustand, XState v5,
Dexie (IndexedDB offline queue), Workbox PWA, Vitest.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pure logic: escalation, routing, where-to-go, patrol, alert machine
npm run build    # type-check + production build + service worker (Vercel-ready)
```

## Using the site

1. On every load or refresh the page is veiled in gray and only the **About** button pulses. Open About,
   read it, close it; then everything is usable.
2. **Left side**
   - **Thalassari / Warden / Both**: choose a band, or see both side by side.
   - **Wearing**: six Thalassari, each with their own Tideprint, Tideprint ID, Depth Mark and place on the map.
     Naela and Oriel stand at the same colony (Garden 3); everyone else is somewhere different.
   - **Pulses**: key to the alert flashes.
   - **The Current**: Cut / Weak / Strong signal.
3. **Right side, SIMULATION**: makes things happen in the world.
   - *Someone reports*: a Thalassari reports from their own colony.
   - *Colony fades*: a case appears, no alarm.
   - *Colony goes dark*: the alarm fires by itself (sensor-triggered).
   - *Every colony fails*: the rare case, everyone must go up a level.
   - *Shortcut test*: shows the depth guard stopping a route that is too deep.
   - *Reset world*: back to the start (with the two default reports).
4. **Real time**: both bands read one store, and separate browser windows are linked through a
   `BroadcastChannel`, so a Thalassari report in one window shows up in a Warden window.

The world starts with **two user reports already waiting** (Maren at Reef 2, Tamsin at Colony 12).

## The bands

**Thalassari** (no swiping, every step is a big button)
- Home: Tideprint and ID, Depth Mark, five-level ladder, a small map (a view only), **REPORT**.
- **REPORT** goes straight to the colony you are standing at. A wearer can only report where they are. Hold
  **REPORT THEFT** (1 s). An optional "where are they going?" card follows and fades on its own.
- Thalassari are not shown a colony's health: every light looks the same. Only a declared or sensor danger
  changes anything.
- **Danger** takes over only the bands of people in the affected area. Others keep their normal Home.
  The affected see a red alert, two red edge flashes, then the map grows and frames them and their way out.
  The route goes to the **nearest bright colony** outside the red zone, never deeper than the wearer's Depth Mark.
  Only if every colony has failed does it send them up a level (and a Shallow mark gets "stay still").
  Hold **I'M SAFE** to close it, or wait for ALL CLEAR.

**Warden**
- The district map (colony names, "You · Layer 1"), then two buttons, **Cases** and **Eyes**, that switch the
  list shown right below them.
  - **Cases** are what the sensors flagged. Reports never appear here.
  - **Eyes** are what Thalassari reported: Tideprint ID, where, where the thief was heading (or `nil`).
- **HANDLED** sits on the side of every row. Press the middle of a row for its popup.
- An eye's popup also has **PATROL** and a hold-to-declare **DANGER**. One eye is enough, and a red colony can
  be declared directly.
- The pinned pad declares district danger; **ALL CLEAR** sends everyone home.

## Signal and the Current

The Current is the water network data travels on. The thin edge of each band shows it: steady cyan (strong),
flickering (weak), gray dashes (cut). While cut, reports and declarations are saved in IndexedDB and sent when
it returns. Browser online/offline events drive the same states.

## Where the rules live

| Rule | File |
| --- | --- |
| WATCH < 70 %, rapid decline > 15 pts / 24 h, CRITICAL < 20 %, 1 eye for danger | `src/logic/thresholds.ts`, `src/logic/escalation.ts` |
| Router never emits a layer deeper than the Depth Mark | `src/logic/routing.ts` (`safeRoute`) |
| Nearest safe colony, next level as a last resort, who must move, local reporting | `src/logic/district.ts` |
| calm → flagged → escalated → danger → allClear | `src/state/alertMachine.ts` |
| Offline queue | `src/state/queue.ts` (Dexie), flushed in `src/state/store.ts` |
| Cross-window live sync | `src/state/sync.ts` |
| Press-and-hold (1000 ms, pressure-aware, keyboard) | `src/components/PressureButton.tsx` |
| Pulse patterns + Vibration API | `src/components/PulseHaptics.ts`, `src/components/AlertPulse.tsx` |

All of the rules above are unit tested in `src/logic/logic.test.ts`.

## Look

- Page is black. The bands are deep water: slate-blue at the surface fading to ink.
- **Structure** uses a sampled water palette: `#1d475c` deep slate, `#2c5f71` harbor, `#5b8d89` sea fog,
  `#628b7b` sage water, `#436d61` kelp green.
- **Signals** keep one job each: sea-cyan is the living world, ochre is caution, coral red is danger,
  brass is Warden authority.
- The wordmark and headings use **Caprasimo** (SIL Open Font License) from Google Fonts. Body text is Nunito and
  Fredoka, also OFL.
- Colour is never the only signal: states also change shape (full jellyfish bell, half-ring, triangle) and
  pulse pattern.

## Notes

- Map space is 100 × 66 units, drawn at 328 × 216 px on the Warden band.
- The "Current silent · N min ago" counter is demo time (1 minute per 6 s, starting at 4).
