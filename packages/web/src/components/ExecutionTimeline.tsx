import { useState } from 'react'
import { Icon, ICONS } from './ui'
import type { ScanStep } from '../api/client'

interface ExecutionTimelineProps {
  steps: ScanStep[]
  loading?: boolean
}

const statusConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  success: { icon: ICONS.check, color: 'var(--success)', bg: 'var(--success-bg)', label: 'Passed' },
  warning: { icon: ICONS.alert, color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Warning' },
  failed: { icon: ICONS.x, color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Failed' },
  running: { icon: ICONS.clock, color: 'var(--info)', bg: 'var(--info-bg)', label: 'Running' },
  pending: { icon: ICONS.clock, color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Pending' },
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

function StepDetails({ details }: { details: string | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!details) return null

  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(details)
  } catch {
    return null
  }

  const entries = Object.entries(parsed ?? {}).filter(([_, v]) => v !== null && v !== undefined)
  if (entries.length === 0) return null

  return (
    <div className="timeline-details">
      <button className="timeline-details-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon d={expanded ? ICONS.chevronDown : ICONS.chevronRight} size={12} />
        {expanded ? 'Hide details' : 'Show details'}
      </button>
      {expanded && (
        <div className="timeline-details-body">
          {entries.map(([key, value]) => (
            <div key={key} className="timeline-detail-row">
              <span className="timeline-detail-key">{key}</span>
              <span className="timeline-detail-value">
                {Array.isArray(value) ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExecutionTimeline({ steps, loading }: ExecutionTimelineProps) {
  if (loading) {
    return (
      <div className="execution-timeline loading">
        <div className="timeline-skeleton" />
        <div className="timeline-skeleton" />
        <div className="timeline-skeleton" />
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="execution-timeline empty">
        <Icon d={ICONS.activity} size={32} />
        <p>No execution steps recorded</p>
        <span className="dim-text">Steps will appear when a scan is run</span>
      </div>
    )
  }

  const totalDuration = steps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)
  const successCount = steps.filter(s => s.status === 'success').length
  const warningCount = steps.filter(s => s.status === 'warning').length
  const failedCount = steps.filter(s => s.status === 'failed').length

  return (
    <div className="execution-timeline">
      {/* Summary bar */}
      <div className="timeline-summary">
        <div className="timeline-summary-item">
          <span className="timeline-summary-value">{steps.length}</span>
          <span className="timeline-summary-label">Steps</span>
        </div>
        <div className="timeline-summary-item">
          <span className="timeline-summary-value">{formatDuration(totalDuration)}</span>
          <span className="timeline-summary-label">Total</span>
        </div>
        <div className="timeline-summary-item success">
          <span className="timeline-summary-value">{successCount}</span>
          <span className="timeline-summary-label">Passed</span>
        </div>
        {warningCount > 0 && (
          <div className="timeline-summary-item warning">
            <span className="timeline-summary-value">{warningCount}</span>
            <span className="timeline-summary-label">Warnings</span>
          </div>
        )}
        {failedCount > 0 && (
          <div className="timeline-summary-item failed">
            <span className="timeline-summary-value">{failedCount}</span>
            <span className="timeline-summary-label">Failed</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="timeline-track">
        {steps.map((step, index) => {
          const config = statusConfig[step.status] ?? statusConfig.pending
          const isLast = index === steps.length - 1

          return (
            <div key={step.id} className={`timeline-item ${step.status}`}>
              {/* Connector line */}
              {!isLast && <div className={`timeline-connector ${steps[index + 1]?.status ?? 'pending'}`} />}

              {/* Node */}
              <div className="timeline-node" style={{ background: config.bg, borderColor: config.color }}>
                <Icon d={config.icon} size={14} className="timeline-node-icon" />
                {step.status === 'running' && <div className="timeline-pulse" style={{ borderColor: config.color }} />}
              </div>

              {/* Content */}
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-step-name">{step.step_name}</span>
                  <div className="timeline-meta">
                    <span className="timeline-time">{formatTime(step.started_at)}</span>
                    <span className="timeline-duration" style={{ color: config.color }}>
                      {formatDuration(step.duration_ms)}
                    </span>
                    <span className="timeline-status-badge" style={{ color: config.color, background: config.bg }}>
                      {config.label}
                    </span>
                  </div>
                </div>

                <StepDetails details={step.details} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
