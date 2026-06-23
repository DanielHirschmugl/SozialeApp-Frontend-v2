import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Fragebogen from './pages/Fragebogen.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import ResultPage from './pages/ResultPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/fragebogen" element={<Fragebogen />} />
        <Route path="/bezahlung" element={<PaymentPage />} />
        <Route path="/ergebnis" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
