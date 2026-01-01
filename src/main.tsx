import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WarningProvider } from './providers/WarningProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WarningProvider>
      <App />
    </WarningProvider>
  </StrictMode>,
)
