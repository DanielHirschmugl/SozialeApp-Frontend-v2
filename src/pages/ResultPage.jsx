import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Fragebogen.css'

const API_BASE = 'http://sozialify.eu'

function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const answers = location.state?.answers
  const token = location.state?.token

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!answers || !token) return

    fetch(`${API_BASE}/api/v1/sllogic/sendAnswers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Token': token,
      },
      body: JSON.stringify(answers),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Analyse fehlgeschlagen (${res.status})`)
        return res.json()
      })
      .then(setResult)
      .catch((err) => setError(err.message))
  }, [answers])

  if (!answers || !token) {
    return (
      <div className="fragebogen-layout">
        <main className="fragebogen-main centered">
          <p className="status-msg error">Kein Ergebnis verfügbar.</p>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fragebogen-layout">
        <main className="fragebogen-main centered">
          <p className="status-msg error">{error}</p>
        </main>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="fragebogen-layout">
        <main className="fragebogen-main centered">
          <div className="spinner" />
          <p className="status-msg">Ihre Analyse wird erstellt…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="fragebogen-layout">
      <main className="fragebogen-main">
        <h1>Ihr Ergebnis</h1>
        <button className="nav-button secondary" style={{ alignSelf: 'flex-start', marginBottom: '8px' }} type="button" onClick={() => navigate('/')}>
          ← Zur Startseite
        </button>
        <div className="result-card">
          <div className="result-row">
            <span className="result-label">Wahrscheinlichkeit eines Anspruchs</span>
            <span className="result-value">{result.probability} %</span>
          </div>
          <div className="result-divider" />
          <div className="result-row">
            <span className="result-label">Genauigkeit der Antworten</span>
            <span className="result-value">{result.accuracy} %</span>
          </div>
          <div className="result-divider" />
          <p className="result-content">{result.content}</p>
        </div>
      </main>
    </div>
  )
}

export default ResultPage
