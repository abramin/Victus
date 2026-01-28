import React, { useState, useEffect, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './pages/App'
import { DisplayModeProvider } from './contexts/DisplayModeContext'
import { PlanProvider } from './contexts/PlanContext'
import { ActiveInstallationProvider } from './contexts/ActiveInstallationContext'
import { waitForBackend } from './api/client'
import './index.css'

function BackendGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    waitForBackend().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DisplayModeProvider>
        <BackendGate>
          <PlanProvider>
            <ActiveInstallationProvider>
              <App />
            </ActiveInstallationProvider>
          </PlanProvider>
        </BackendGate>
      </DisplayModeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
