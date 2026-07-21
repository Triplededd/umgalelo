import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AmbientBackground from './components/AmbientBackground.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AmbientBackground />
    <App />
  </StrictMode>,
)
