import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './Fragebogen.css'

function buildSteps(questions, parentAnswers) {
  const steps = []
  for (let pi = 0; pi < questions.length; pi++) {
    const parent = questions[pi]
    steps.push({ type: 'parent', parentIndex: pi })

    const answer = parentAnswers[parent.questionId]
    if (answer !== undefined && answer !== '') {
      parent.childQuestions
        .filter((child) => String(child.condition) === answer)
        .forEach((_, ci) => {
          steps.push({ type: 'child', parentIndex: pi, childIndex: ci })
        })
    }
  }
  return steps
}

function QuestionInput({ datatype, value, onChange, inputKey }) {
  if (datatype?.toUpperCase() === 'BOOLEAN') {
    return (
      <div className="radio-group">
        <label className="radio-label">
          <input
            type="radio"
            name={inputKey}
            value="true"
            checked={value === 'true'}
            onChange={() => onChange('true')}
          />
          Ja
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name={inputKey}
            value="false"
            checked={value === 'false'}
            onChange={() => onChange('false')}
          />
          Nein
        </label>
      </div>
    )
  }

  return (
    <input
      className="text-input"
      type={datatype?.toUpperCase() === 'INTEGER' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ihre Antwort…"
    />
  )
}

function Fragebogen() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [parentAnswers, setParentAnswers] = useState({})
  const [childAnswers, setChildAnswers] = useState({})

  useEffect(() => {
    fetch("https://sozialify.eu/api/v1/sllogic/getQuestions?lawId=SGB%20II")
      .then((res) => {
        if (!res.ok) throw new Error(`Fehler: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setQuestions(data.questions ?? [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const steps = useMemo(
    () => buildSteps(questions, parentAnswers),
    [questions, parentAnswers]
  )

  const step = steps[stepIndex]

  function resolveStep() {
    if (!step) return { question: null, answer: '' }
    const parent = questions[step.parentIndex]

    if (step.type === 'parent') {
      return { question: parent, answer: parentAnswers[parent.questionId] ?? '' }
    }

    const visibleChildren = parent.childQuestions.filter(
      (c) => String(c.condition) === parentAnswers[parent.questionId]
    )
    const child = visibleChildren[step.childIndex]
    const answer = childAnswers[parent.questionId]?.[child.questionId] ?? ''
    return { question: child, answer, parentId: parent.questionId, childId: child.questionId }
  }

  const { question, answer, parentId, childId } = resolveStep()

  function setAnswer(value) {
    if (!step) return
    if (step.type === 'parent') {
      const parent = questions[step.parentIndex]
      setParentAnswers((prev) => ({ ...prev, [parent.questionId]: value }))
      setChildAnswers((prev) => ({ ...prev, [parent.questionId]: {} }))
    } else {
      setChildAnswers((prev) => ({
        ...prev,
        [parentId]: { ...prev[parentId], [childId]: value },
      }))
    }
  }

  const canProceed = answer !== '' && answer !== undefined
  const isLast = stepIndex === steps.length - 1

  function buildRequestWith(pAnswers, cAnswers) {
    return {
      lawId: 'SGB II',
      parentAnswers: questions.map((parent) => {
        const pAnswer = pAnswers[parent.questionId] ?? ''
        const visibleChildren = parent.childQuestions.filter(
          (c) => String(c.condition) === pAnswer
        )
        return {
          parentQuestionId: parent.questionId,
          parentQuestion: parent.content,
          answer: pAnswer,
          childAnswers: visibleChildren.map((child) => ({
            childQuestionId: child.questionId,
            childQuestion: child.content,
            answer: cAnswers[parent.questionId]?.[child.questionId] ?? '',
          })),
        }
      }),
    }
  }

  function buildRequest() {
    return buildRequestWith(parentAnswers, childAnswers)
  }

  function handleNext() {
    if (!isLast) {
      setStepIndex((i) => i + 1)
    } else {
      navigate('/bezahlung', { state: { answers: buildRequest() } })
    }
  }

  function handleSkip() {
    if (!step) return

    let newParentAnswers = parentAnswers
    let newChildAnswers = childAnswers

    if (step.type === 'parent') {
      const parent = questions[step.parentIndex]
      newParentAnswers = { ...parentAnswers, [parent.questionId]: '' }
      newChildAnswers = { ...childAnswers, [parent.questionId]: {} }
    } else {
      newChildAnswers = {
        ...childAnswers,
        [parentId]: { ...childAnswers[parentId], [childId]: '' },
      }
    }

    if (!isLast) {
      setParentAnswers(newParentAnswers)
      setChildAnswers(newChildAnswers)
      setStepIndex((i) => i + 1)
    } else {
      navigate('/bezahlung', { state: { answers: buildRequestWith(newParentAnswers, newChildAnswers) } })
    }
  }

  const progressPercent = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0

  return (
    <div className="fragebogen-layout">
      <main className="fragebogen-main">
        <h1>Bürgergeld-Anspruch prüfen</h1>

        {loading && <p className="status-msg">Fragen werden geladen…</p>}
        {error && (
          <p className="status-msg error">
            Fragen konnten nicht geladen werden: {error}
          </p>
        )}
        {!loading && !error && question && (
          <div className="wizard">
            <p className="ai-disclaimer ai-disclaimer--top">
              Hinweis: KI kann Fehler machen. Für eine genaue Überprüfung empfehlen wir, mit einem Experten zu sprechen.
            </p>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="question-card">
              <p className="question-text">{question.content}</p>
              <QuestionInput
                datatype={question.datatype}
                value={answer}
                onChange={setAnswer}
                inputKey={`step-${stepIndex}`}
              />
            </div>

            <div className="wizard-nav">
              <button
                className="nav-button secondary"
                type="button"
                onClick={handleSkip}
              >
                Überspringen
              </button>
              <button
                className="nav-button primary"
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
              >
                {isLast ? 'Anspruch prüfen lassen' : 'Weiter →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Fragebogen
