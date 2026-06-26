import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import './PaymentPage.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_REPLACE_ME'
console.log('[Stripe] Publishable Key Prefix:', PUBLISHABLE_KEY.substring(0, 12))
const stripePromise = loadStripe(PUBLISHABLE_KEY)
const API_BASE = 'https://sozialify.eu'
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 15

function CheckoutForm({ orderId, token, answers }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [paying, setPaying] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  function proceedToResult() {
    navigate('/ergebnis', { state: { answers, token } })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message)
      setPaying(false)
      return
    }

    setPolling(true)
    let attempts = 0
    let done = false

    pollRef.current = setInterval(async () => {
      if (done) return
      attempts++

      let paid = false
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/sllogic/getOrderStatus?orderId=${orderId}`
        )
        const raw = await res.text()
        paid = raw.replace(/"/g, '') === 'PAID'
      } catch { /* ignore, retry */ }

      if (paid) {
        done = true
        clearInterval(pollRef.current)
        proceedToResult()
      } else if (attempts >= MAX_POLL_ATTEMPTS) {
        done = true
        clearInterval(pollRef.current)
        setError('Zahlung konnte nicht bestätigt werden. Bitte wenden Sie sich an den Support.')
        setPolling(false)
        setPaying(false)
      }
    }, POLL_INTERVAL_MS)
  }

  const buttonLabel = polling
    ? 'Zahlung wird bestätigt…'
    : paying
    ? 'Verarbeitung…'
    : '1,99 € bezahlen'

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement onLoadError={(e) => console.error('[Stripe] PaymentElement Fehler:', e)} />
      {error && <p className="status-msg error">{error}</p>}
      <button
        type="submit"
        className="nav-button primary payment-submit"
        disabled={!stripe || paying}
      >
        {buttonLabel}
      </button>
    </form>
  )
}

function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const answers = location.state?.answers

  const [confirmed, setConfirmed] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ firstName: '', lastName: '', email: '' })
  const [clientSecret, setClientSecret] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!answers) {
    navigate('/fragebogen', { replace: true })
    return null
  }

  async function handleCustomerSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const orderRes = await fetch(`${API_BASE}/api/v1/sllogic/createOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInCents: 199,
          currency: 'eur',
          email: customerInfo.email,
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
        }),
      })
      if (!orderRes.ok) throw new Error(`Bestellung fehlgeschlagen (${orderRes.status})`)
      const { orderId: oid, token: tok } = await orderRes.json()

      const intentRes = await fetch(`${API_BASE}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Token': tok,
        },
        body: JSON.stringify({ orderId: oid }),
      })
      if (!intentRes.ok) throw new Error(`Payment-Intent fehlgeschlagen (${intentRes.status})`)
      const { clientSecret: cs } = await intentRes.json()

      console.log('[Payment] clientSecret erhalten:', cs ? cs.substring(0, 20) + '…' : 'FEHLT')
      console.log('[Payment] orderId:', oid)
      setOrderId(oid)
      setToken(tok)
      setClientSecret(cs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="fragebogen-layout">
        <main className="fragebogen-main centered">
          <div className="spinner" />
          <p className="status-msg">Zahlungsseite wird vorbereitet…</p>
        </main>
      </div>
    )
  }

  if (!confirmed) {
    return (
      <div className="fragebogen-layout">
        <main className="fragebogen-main">
          <h1>KI-Bericht kaufen?</h1>
          <p className="payment-description">
            Möchten Sie Ihre individuelle KI-gestützte Auswertung für einmalig{' '}
            <strong>1,99 €</strong> erwerben?
          </p>
          <div className="confirm-actions">
            <button
              className="nav-button primary"
              type="button"
              onClick={() => setConfirmed(true)}
            >
              Ja, Bericht kaufen
            </button>
            <button
              className="nav-button secondary"
              type="button"
              onClick={() => navigate('/')}
            >
              Nein, danke
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="fragebogen-layout">
      <main className="fragebogen-main">
        <h1>Persönliche Analyse</h1>
        <p className="payment-description">
          Erhalten Sie Ihre individuelle KI-gestützte Auswertung für einmalig{' '}
          <strong>1,99 €</strong>.
        </p>

        {!clientSecret ? (
          <form onSubmit={handleCustomerSubmit} className="payment-form">
            <div className="customer-fields">
              <input
                className="text-input"
                type="text"
                placeholder="Vorname"
                required
                value={customerInfo.firstName}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, firstName: e.target.value }))}
              />
              <input
                className="text-input"
                type="text"
                placeholder="Nachname"
                required
                value={customerInfo.lastName}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, lastName: e.target.value }))}
              />
              <input
                className="text-input"
                type="email"
                placeholder="E-Mail-Adresse"
                required
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <button type="submit" className="nav-button primary payment-submit">
              Weiter zur Zahlung →
            </button>
          </form>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm orderId={orderId} token={token} answers={answers} />
          </Elements>
        )}
      </main>
    </div>
  )
}

export default PaymentPage
