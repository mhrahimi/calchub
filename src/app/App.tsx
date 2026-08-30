import { HashRouter } from 'react-router-dom'
import { AppProvider } from './providers'
import { AppRoutes } from './routes'

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  )
}
