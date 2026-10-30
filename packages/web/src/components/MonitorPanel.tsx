import { useState } from 'react'
import { api } from '../api/client'
import type { Monitor } from '../api/client'
import { useToast } from '../hooks/useToast'
import StatusBadge from './StatusBadge'

interface MonitorPanelProps {
  monitors: Monitor[]
  onMonitorCreated: (monitor: Monitor) => void
  onToggle: (id: string, active: boolean) => void
}

const INTERVALS = [
  { value: 1, label: 'Every minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Hourly' },
  { value: 1440, label: 'Daily' },
]

export default function MonitorPanel({ monitors, onMonitorCreated, onToggle }: MonitorPanelProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const monitor = await api.createMonitor({ name, url, interval_seconds: interval * 60 })
      onMonitorCreated(monitor)
      setName('')
      setUrl('')
      success(`Monitor "${name}" created`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create monitor'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="monitors-layout">
      <section className="panel">
        <div className="panel-header">
          <h2>Create Monitor</h2>
        </div>
        <p className="panel-desc">Monitor a website or API endpoint for uptime.</p>

        <form onSubmit={handleSubmit} className="monitor-form">
          <div className="form-group">
            <label className="label" htmlFor="monitor-name">Name</label>
            <input
              id="monitor-name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="monitor-url">URL</label>
            <input
              id="monitor-url"
              className="input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="monitor-interval">Check Interval</label>
            <select
              id="monitor-interval"
              className="select"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value, 10))}
            >
              {INTERVALS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Creating…</>
            ) : '💓 Add Monitor'}
          </button>
        </form>

        {error && <div className="form-error">{error}</div>}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Monitors</h2>
          <span className="badge">{monitors.length}</span>
        </div>

        {monitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💓</div>
            <h3>No monitors yet</h3>
            <p>Create a monitor to start tracking uptime.</p>
          </div>
        ) : (
          <div className="monitor-list">
            {monitors.map((m) => (
              <div key={m.id} className={`monitor-item ${m.is_active ? '' : 'inactive'}`}>
                <div className="monitor-info">
                  <div className="monitor-name-row">
                    <strong>{m.name}</strong>
                    <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                  </div>
                  <span className="monitor-url">{m.url}</span>
                  <div className="monitor-meta">
                    <span className="badge badge-info">
                      Every {m.interval_seconds >= 3600
                        ? m.interval_seconds >= 86400
                          ? 'day'
                          : `${m.interval_seconds / 3600}h`
                        : m.interval_seconds >= 60
                          ? `${Math.round(m.interval_seconds / 60)}m`
                          : `${m.interval_seconds}s`}
                    </span>
                    <span className="text-muted text-sm">
                      Added {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="monitor-actions">
                  <button
                    className={`toggle-switch ${m.is_active ? 'on' : ''}`}
                    onClick={() => onToggle(m.id, !m.is_active)}
                    title={m.is_active ? 'Pause' : 'Resume'}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
