import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.tsx'

// Clear legacy mock session if exists
try {
  const saved = localStorage.getItem('quizmaster_auth_user');
  if (saved && saved.includes('Thu Hà')) {
    localStorage.removeItem('quizmaster_auth_user');
    localStorage.removeItem('quizmaster_auth_token');
  }
} catch {
  // Ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
