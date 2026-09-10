import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/industry.css'
import './styles/app.css'
import { DataProvider } from './lib/store'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)
