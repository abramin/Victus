import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './pages/App'
import { DisplayModeProvider } from './contexts/DisplayModeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DisplayModeProvider>
      <App />
    </DisplayModeProvider>
  </React.StrictMode>
)
