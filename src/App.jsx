import { useNavigate } from 'react-router-dom'
import './App.css'

function App() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <main className="hero-section">
        <h1 className="hero-title">
          Willkommen bei der<br />Sozialen App.
        </h1>

        <p className="hero-subtitle">
          Erhalten Sie mit einem kurzen Fragebogen und einer KI-gestützten
          Gesetzestextanalyse eine erste Einschätzung zu Ihrem Bürgergeld-Anspruch.
        </p>

        <button className="cta-button" type="button" onClick={() => navigate('/fragebogen')}>
          Jetzt starten
        </button>

        <p className="hero-note">
          Kostenlos &middot; Anonym &middot; In wenigen Minuten
        </p>
      </main>

      <footer className="footer">
        <p>Soziale App &copy; {new Date().getFullYear()} &middot; Keine Rechtsberatung &middot; Nur eine erste Orientierung</p>
      </footer>
    </div>
  )
}

export default App
