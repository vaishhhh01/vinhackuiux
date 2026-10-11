const fs = require('fs')
const rd = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const patch = (f, pairs) => {
  let s = rd(f)
  for (const [a, b, all] of pairs) {
    if (!s.includes(a)) throw new Error(f + ' missing: ' + a.slice(0, 70))
    s = all ? s.split(a).join(b) : s.replace(a, b)
  }
  fs.writeFileSync(f, s)
}

// The sampled water palette is used for STRUCTURE (surfaces, rings, wells, rails).
// Signal colours (living cyan, ochre, red, brass) stay exactly as they were.
patch('src/styles/tokens.css', [[
  '  --calm-blue: var(--living-light);',
  `  --calm-blue: var(--living-light);

  /* sampled water: structure only (surfaces, rings, wells), never a signal */
  --slate-deep: #1d475c;   /* deep water, top of a band */
  --harbor: #2c5f71;       /* raised surfaces, rings */
  --sea-fog: #5b8d89;      /* hairlines on dark */
  --sage-water: #628b7b;   /* dashed "you may enter" lines, quiet borders */
  --kelp-green: #436d61;   /* weed, tabs, inert chrome */`]])

// the band: a bluer, deeper top; harbor edge; weed in kelp-green
patch('src/components/BandShell.tsx', [
  ["const tabColor = warden ? '#8a6d2a' : '#1d6a66'", "const tabColor = warden ? '#8a6d2a' : '#436d61'"],
  ["radial-gradient(120% 80% at 50% 0%, #0f3470 0%, #0a2548 30%, var(--abyss-2) 55%, var(--abyss) 100%)", "radial-gradient(120% 80% at 50% 0%, #1d475c 0%, #153646 32%, var(--abyss-2) 60%, var(--abyss) 100%)"],
  ["? '0 0 0 2px #14495a, 0 30px 60px rgba(0,0,0,0.55)'", "? '0 0 0 2px #2c5f71, 0 30px 60px rgba(0,0,0,0.55)'"],
  [": '0 0 0 2px #14495a, 0 0 54px rgba(77,232,210,0.28), 0 30px 60px rgba(0,0,0,0.55)'", ": '0 0 0 2px #2c5f71, 0 0 54px rgba(77,232,210,0.18), 0 30px 60px rgba(0,0,0,0.55)'"],
  ["stroke={warden ? '#8a6d2a' : '#1d6a66'}", "stroke={warden ? '#8a6d2a' : '#436d61'}"],
])

// the water maps
patch('src/components/LightMap.tsx', [
  ["radial-gradient(90% 90% at 50% 35%, #0f3350, #071b2d 85%)", "radial-gradient(90% 90% at 50% 35%, #1d475c, #0d2531 88%)"],
  ["border: '1.5px solid rgba(77,232,210,0.3)'", "border: '1.5px solid rgba(91,141,137,0.55)'"],
])
patch('src/components/LayerMap.tsx', [
  ["radial-gradient(90% 90% at 50% 40%, #12354f, #071b2d 85%)", "radial-gradient(90% 90% at 50% 40%, #1d475c, #0d2531 88%)"],
])

// pop-ups and wells
patch('src/components/DetailPopup.tsx', [
  ["linear-gradient(180deg, #0f2d46, #07192a)", "linear-gradient(180deg, #1d475c, #0c2430)"],
])
patch('src/components/ReportChooser.tsx', [
  ["background: 'rgba(10,34,54,0.85)', border: '1px solid rgba(77,232,210,0.3)'", "background: 'rgba(29,71,92,0.7)', border: '1px solid rgba(91,141,137,0.5)'"],
])
patch('src/screens/ColonyDetail.tsx', [
  ["background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(228,246,243,0.14)'", "background: 'rgba(44,95,113,0.28)', border: '1px solid rgba(91,141,137,0.5)'"],
])
patch('src/components/Tideprint.tsx', [
  ['fill="rgba(10,34,54,0.92)"', 'fill="rgba(29,71,92,0.92)"'],
])
patch('src/screens/CitizenHome.tsx', [
  ["rgba(77,232,210,0.25), rgba(10,34,54,0.95)", "rgba(77,232,210,0.22), rgba(29,71,92,0.95)"],
])

// the depth ladder: "you may enter" water in sage, wells in harbor
patch('src/components/DepthLadder.tsx', [
  ["allowed ? 'rgba(77,232,210,0.05)' : 'var(--locked-gray)'", "allowed ? 'rgba(44,95,113,0.35)' : 'var(--locked-gray)'"],
  ["allowed ? '1.5px dashed rgba(77,232,210,0.45)' : '1.5px solid transparent'", "allowed ? '1.5px dashed rgba(98,139,123,0.85)' : '1.5px solid transparent'"],
  ["border-[rgba(77,232,210,0.7)]", "border-[rgba(98,139,123,0.95)]"],
])

// website chrome: rails, wearer picker, the Current, SIMULATION frame
patch('src/App.tsx', [
  ["'rgba(228,246,243,0.18)'", "'rgba(98,139,123,0.55)'", true],
  ["style={{ background: 'rgba(255,255,255,0.04)', border: '2.5px solid rgba(98,139,123,0.55)' }}", "style={{ background: 'rgba(29,71,92,0.28)', border: '2.5px solid rgba(98,139,123,0.55)' }}"],
])
patch('src/screens/WardenDashboard.tsx', [
  ["'1.5px solid rgba(228,246,243,0.18)'", "'1.5px solid rgba(98,139,123,0.55)'", true],
])
patch('src/components/SimulatorPanel.tsx', [
  ["rgba(228,246,243,0.35)", "rgba(98,139,123,0.7)"],
])
console.log('ok')
