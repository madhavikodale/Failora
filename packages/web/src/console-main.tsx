import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ConsoleApp from './components/ConsoleApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConsoleApp />
  </StrictMode>,
)
