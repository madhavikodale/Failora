import { useState } from 'react'
import type { Target } from '../api/types'

interface RunTestFormProps {
  targets: Target[]
  onSubmit: (data: { target_id: string; mode: string; timeout_ms?: number; max_retries?: number }) => Promise<unknown>
}

const MODES = [
  { value: 'timeout', label: 'Timeout' },
  { value: 'http_429', label: 'HTTP 429 (Rate Limited)' },
  { value: 'http_500', label: 'HTTP 500 (Server Error)' },
  { value: 'malformed_response', label: 'Malformed Response' },
]

function RunTestForm({ targets, onSubmit }: RunTestFormProps) {
  const [targetId, setTargetId] = useState('')
  const [mode, setMode] = useState('timeout')
  const [timeoutMs, setTimeoutMs] = useState('3000')
  const [maxRetries, setMaxRetries] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetId) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      await onSubmit({
        target_id: targetId,
        mode,
        timeout_ms: mode === 'timeout' ? parseInt(timeoutMs, 10) : undefined,
        max_retries: parseInt(maxRetries, 10),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="run-target">Target</label>
        <select id="run-target" value={targetId} onChange={e => setTargetId(e.target.value)} required>
          <option value="">Select a target…</option>
          {targets.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="run-mode">Scenario</label>
        <select id="run-mode" value={mode} onChange={e => setMode(e.target.value)}>
          {MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      {mode === 'timeout' && (
        <div className="form-row">
          <label htmlFor="run-timeout">Timeout (ms)</label>
          <input
            id="run-timeout"
            type="number"
            min="100"
            max="60000"
            value={timeoutMs}
            onChange={e => setTimeoutMs(e.target.value)}
          />
        </div>
      )}
      <div className="form-row">
        <label htmlFor="run-retries">Max Retries</label>
        <input
          id="run-retries"
          type="number"
          min="0"
          max="10"
          value={maxRetries}
          onChange={e => setMaxRetries(e.target.value)}
        />
      </div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Test started! Check Recent Runs.</div>}
      <button type="submit" disabled={submitting || targets.length === 0}>
        {submitting ? 'Starting…' : targets.length === 0 ? 'No targets available' : 'Run Test'}
      </button>
    </form>
  )
}

export default RunTestForm
