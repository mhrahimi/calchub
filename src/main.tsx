import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import './styles/globals.css'

// Register immediately so the first visit finishes precaching before the user goes offline
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('[CalcHub] Service worker registration failed', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
