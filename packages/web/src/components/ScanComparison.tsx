import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { ScanResult, ScanStep } from '../api/client'
import ScoreRing from './ScoreRing'
import StatusBadge from './StatusBadge'
import { Icon, ICONS, Card, Badge, EmptyState } from './ui'

interface ScanComparisonProps {
  scans: ScanResult[]
  onClose?: () => void
}

interface ParsedScanData {
  health?: { isUp?: boolean; statusCode?: number; responseTimeMs?: number }
  ssl?: { valid?: boolean; daysUntilExpiry?: number; issuer?: string }
  securityHeaders?: { score?: number; missing?: string[] }
  performance?: { ttfbMs?: number; totalTimeMs?: number; transferSize?: number }
  dns?: { resolved?: boolean; ip?: string }
  overallScore?: number
}

function parseScanResult(result: string | null): ParsedScanData {
  if (!result) return {}
  try {
    return JSON.parse(result) as ParsedScanData
  } catch {
    return {}
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function ComparisonRow({
  label,
  scanA,
  scanB,
  render,
}: {
  label: string
  scanA: ScanResult
  scanB: ScanResult
  render: (scan: ScanResult) => React.ReactNode
}) {
  const valA = render(scanA)
  const valB = render(scanB)

  return (
    <div className="comparison-row">
      <div className="comparison-label">{label}</div>
      <div className="comparison-value">{valA}</div>
      <div className="comparison-value">{valB}</div>
    </div>
  )
}

export default function ScanComparison({ scans, onClose }: ScanComparisonProps) {
  const [scanAId, setScanAId] = useState<string>(scans[0]?.id ?? '')
  const [scanBId, setScanBId] = useState<string>(scans[1]?.id ?? scans[0]?.id ?? '')
  const [scanASteps, setScanASteps] = useState<ScanStep[]>([])
  const [scanBSteps, setScanBSteps] = useState<ScanStep[]>([])

  const scanA = scans.find(s => s.id === scanAId)
  const scanB = scans.find(s => s.id === scanBId)

  useEffect(() => {
    if (scanAId) {
      api.getScanSteps(scanAId).then(setScanASteps).catch(() => setScanASteps([]))
    }
  }, [scanAId])

  useEffect(() => {
    if (scanBId) {
      api.getScanSteps(scanBId).then(setScanBSteps).catch(() => setScanBSteps([]))
    }
  }, [scanBId])

  if (scans.length < 1) {
    return (
      <Card>
        <EmptyState
          icon={ICONS.activity}
          title="No scans to compare"
          description="Run at least one scan to use comparison view."
        />
      </Card>
    )
  }

  const dataA = scanA ? parseScanResult(scanA.result) : {}
  const dataB = scanB ? parseScanResult(scanB.result) : {}

  const scoreDiff = (dataA.overallScore ?? 0) - (dataB.overallScore ?? 0)
  const healthDiff = (dataA.health?.responseTimeMs ?? 0) - (dataB.health?.responseTimeMs ?? 0)

  return (
    <div className="scan-comparison">
      {/* Header */}
      <div className="comparison-header">
        <div className="comparison-title">
          <Icon d={ICONS.activity} size={20} />
          <h2>Scan Comparison</h2>
        </div>
        {onClose && (
          <button className="comparison-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Selector */}
      <div className="comparison-selector">
        <div className="comparison-select-group">
          <label>Scan A</label>
          <select value={scanAId} onChange={e => setScanAId(e.target.value)}>
            {scans.map(s => (
              <option key={s.id} value={s.id}>
                {s.url} — {formatDate(s.created_at)}
              </option>
            ))}
          </select>
        </div>
        <div className="comparison-vs">VS</div>
        <div className="comparison-select-group">
          <label>Scan B</label>
          <select value={scanBId} onChange={e => setScanBId(e.target.value)}>
            {scans.map(s => (
              <option key={s.id} value={s.id}>
                {s.url} — {formatDate(s.created_at)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {scanA && scanB && (
        <>
          {/* Score Cards */}
          <div className="comparison-scores">
            <div className="comparison-score-card">
              <ScoreRing
                score={dataA.overallScore ?? 0}
                size={100}
                strokeWidth={8}
                label="Scan A"
              />
              <div className="comparison-score-meta">
                <div className="comparison-score-url">{scanA.url}</div>
                <div className="comparison-score-date">{formatDate(scanA.created_at)}</div>
                <StatusBadge status={scanA.status} />
              </div>
            </div>

            <div className="comparison-diff">
              {scoreDiff !== 0 && (
                <div className={`comparison-diff-badge ${scoreDiff > 0 ? 'positive' : 'negative'}`}>
                  {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(0)} pts
                </div>
              )}
              <div className="comparison-diff-label">Score Difference</div>
            </div>

            <div className="comparison-score-card">
              <ScoreRing
                score={dataB.overallScore ?? 0}
                size={100}
                strokeWidth={8}
                label="Scan B"
              />
              <div className="comparison-score-meta">
                <div className="comparison-score-url">{scanB.url}</div>
                <div className="comparison-score-date">{formatDate(scanB.created_at)}</div>
                <StatusBadge status={scanB.status} />
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <Card className="comparison-table-card">
            <div className="comparison-table">
              <div className="comparison-table-header">
                <div className="comparison-label">Metric</div>
                <div className="comparison-value-header">Scan A</div>
                <div className="comparison-value-header">Scan B</div>
              </div>

              <ComparisonRow
                label="Overall Score"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  const score = d.overallScore ?? 0
                  return (
                    <span className={`comparison-score ${score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'}`}>
                      {d.overallScore ?? '—'}
                    </span>
                  )
                }}
              />

              <ComparisonRow
                label="Status"
                scanA={scanA}
                scanB={scanB}
                render={s => <StatusBadge status={s.status} />}
              />

              <ComparisonRow
                label="Response Time"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return formatDuration(d.health?.responseTimeMs ?? null)
                }}
              />

              <ComparisonRow
                label="HTTP Status"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return d.health?.statusCode ? (
                    <Badge variant={d.health.statusCode < 400 ? 'success' : 'danger'}>
                      {d.health.statusCode}
                    </Badge>
                  ) : '—'
                }}
              />

              <ComparisonRow
                label="SSL Valid"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return d.ssl?.valid !== undefined ? (
                    <Badge variant={d.ssl.valid ? 'success' : 'danger'}>
                      {d.ssl.valid ? 'Valid' : 'Invalid'}
                    </Badge>
                  ) : '—'
                }}
              />

              <ComparisonRow
                label="SSL Expiry"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return d.ssl?.daysUntilExpiry !== undefined ? (
                    <span className={d.ssl.daysUntilExpiry < 30 ? 'text-warning' : ''}>
                      {d.ssl.daysUntilExpiry} days
                    </span>
                  ) : '—'
                }}
              />

              <ComparisonRow
                label="Security Score"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return (
                    <span className={`comparison-score ${(d.securityHeaders?.score ?? 0) >= 70 ? 'good' : (d.securityHeaders?.score ?? 0) >= 40 ? 'fair' : 'poor'}`}>
                      {d.securityHeaders?.score ?? '—'}
                    </span>
                  )
                }}
              />

              <ComparisonRow
                label="TTFB"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return d.performance?.ttfbMs !== undefined ? `${d.performance.ttfbMs}ms` : '—'
                }}
              />

              <ComparisonRow
                label="DNS Resolved"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return d.dns?.resolved !== undefined ? (
                    <Badge variant={d.dns.resolved ? 'success' : 'danger'}>
                      {d.dns.resolved ? 'Yes' : 'No'}
                    </Badge>
                  ) : '—'
                }}
              />

              <ComparisonRow
                label="DNS IP"
                scanA={scanA}
                scanB={scanB}
                render={s => {
                  const d = parseScanResult(s.result)
                  return <code className="comparison-code">{d.dns?.ip ?? '—'}</code>
                }}
              />
            </div>
          </Card>

          {/* Steps Comparison */}
          {(scanASteps.length > 0 || scanBSteps.length > 0) && (
            <Card className="comparison-steps-card">
              <div className="card-header">
                <h3><Icon d={ICONS.clock} size={16} /> Step Timing</h3>
              </div>
              <div className="comparison-steps">
                <div className="comparison-steps-header">
                  <div className="comparison-label">Step</div>
                  <div className="comparison-value-header">Scan A</div>
                  <div className="comparison-value-header">Scan B</div>
                </div>
                {scanASteps.map((stepA, i) => {
                  const stepB = scanBSteps[i]
                  return (
                    <div key={stepA.id} className="comparison-step-row">
                      <div className="comparison-label">
                        <span className={`step-status-icon ${stepA.status}`} />
                        {stepA.step_name}
                      </div>
                      <div className="comparison-value">
                        <span className={`step-duration ${stepA.status}`}>
                          {formatDuration(stepA.duration_ms)}
                        </span>
                      </div>
                      <div className="comparison-value">
                        {stepB ? (
                          <span className={`step-duration ${stepB.status}`}>
                            {formatDuration(stepB.duration_ms)}
                          </span>
                        ) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Health Response Time Diff */}
          {healthDiff !== 0 && (
            <Card className="comparison-insight-card">
              <div className="comparison-insight">
                <Icon d={ICONS.zap} size={18} />
                <div>
                  <strong>Performance Insight:</strong>{' '}
                  {healthDiff > 0 ? (
                    <span>Scan B is faster by {Math.abs(healthDiff)}ms</span>
                  ) : (
                    <span>Scan A is faster by {Math.abs(healthDiff)}ms</span>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
