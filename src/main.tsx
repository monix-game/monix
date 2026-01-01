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

// --------------------------------------------
// Attributions
// --------------------------------------------
//
// Emojis provided by Twemoji (https://github.com/jdecked/twemoji) under the CC-BY 4.0 License (https://creativecommons.org/licenses/by/4.0/)
// Icons provided by Tabler Icons (https://tabler-icons.io/) under the MIT License (https://opensource.org/licenses/MIT)
// Some other assets obtained from public domain sources.
// This application is not affiliated with or endorsed by any of the original asset creators.
// All rights reserved by their respective owners.
