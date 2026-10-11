import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { startSync } from './state/sync'

startSync()

try {
  registerSW({ immediate: true })
} catch {
  /* service worker unavailable (dev, private mode): the app still runs */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
