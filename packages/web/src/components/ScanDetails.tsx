import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ScanResult } from '../api/client'
import ScoreRing from './ScoreRing'
import StatusBadge from './StatusBadge'

interface ScanDetailsProps {
  scan: ScanResult
  onClose: () => void
  onUpdate: (scan: ScanResult) => void
}

interface ScanFinding {
  id: string
  category: string
  severity: string
  title: string
  description: string
  evidence?: Record<string, unknown>
  impact?: string
  recommendation?: string
}

type DetailTab = 'health' | 'ssl' | 'dns' | 'performance' | 'findings'

export default function ScanDetails({ scan, onClose, onUpdate }: ScanDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('health')

  useEffect(() => {
    if (scan.status === 'pending' || scan.status === 'running') {
      const interval = setInterval(async () => {
        try {
          const updated = await api.getScan(scan.id)
          onUpdate(updated)
          if (updated.status !== 'pending' && updated.status !== 'running') {
            clearInterval(interval)
          }
        } catch {
          // silent
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [scan.id, scan.status, onUpdate])

  const result = scan.result ? JSON.parse(scan.result) : null
  const findings: ScanFinding[] = result?.findings ?? []

  const findingCounts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  }

  const tabs: { id: DetailTab; label: string; icon: string }[] = [
    { id: 'health', label: 'Health', icon: '💓' },
    { id: 'ssl', label: 'SSL/TLS', icon: '🔒' },
    { id: 'dns', label: 'DNS', icon: '🌐' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'findings', label: `Findings (${findings.length})`, icon: '🛡️' },
  ]

  const getSeverityBadge = (sev: string) => {
    const map: Record<string, string> = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    }
    return map[sev] ?? 'badge-muted'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-4">
            {scan.overall_score !== null && (
              <ScoreRing score={scan.overall_score} size={48} strokeWidth={4} />
            )}
            <div>
              <h2>Scan Details</h2>
              <span className="text-muted text-sm">{scan.url}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Status row */}
          <div className="detail-meta">
            <StatusBadge status={scan.status} />
            <span className="text-muted text-sm">
              Started: {new Date(scan.created_at).toLocaleString()}
            </span>
            {scan.completed_at && (
              <span className="text-muted text-sm">
                Completed: {new Date(scan.completed_at).toLocaleString()}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="tab-content mt-6">
            {activeTab === 'health' && result?.health && (
              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={result.health.isUp ? 'text-success' : 'text-danger'}>
                      {result.health.isUp ? '✓ Up' : '✗ Down'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status Code</span>
                    <span className={`badge ${result.health.statusCode >= 200 && result.health.statusCode < 300 ? 'badge-success' : 'badge-danger'}`}>
                      {result.health.statusCode}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Response Time</span>
                    <strong>{result.health.responseTimeMs}ms</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Server</span>
                    <span>{result.health.headers?.server ?? 'Unknown'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ssl' && result?.ssl && (
              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Valid</span>
                    <span className={result.ssl.valid ? 'text-success' : 'text-danger'}>
                      {result.ssl.valid ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Issuer</span>
                    <span>{result.ssl.issuer}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Protocol</span>
                    <span className="badge badge-info">{result.ssl.protocol}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Expires In</span>
                    <strong className={result.ssl.daysRemaining < 30 ? 'text-danger' : result.ssl.daysRemaining < 60 ? 'text-warning' : 'text-success'}>
                      {result.ssl.daysRemaining} days
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dns' && result?.dns && (
              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Domain</span>
                    <span className="font-mono">{result.dns.domain}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">MX Record</span>
                    <span className={result.dns.hasMX ? 'text-success' : 'text-warning'}>
                      {result.dns.hasMX ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">SPF</span>
                    <span className={result.dns.hasSPF ? 'text-success' : 'text-warning'}>
                      {result.dns.hasSPF ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">DMARC</span>
                    <span className={result.dns.hasDMARC ? 'text-success' : 'text-warning'}>
                      {result.dns.hasDMARC ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>
                {result.dns.records?.A && (
                  <div className="dns-records mt-4">
                    <h4>A Records</h4>
                    <div className="record-list">
                      {result.dns.records.A.map((ip: string, i: number) => (
                        <code key={i} className="record-item">{ip}</code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'performance' && result?.performance && (
              <div className="detail-section">
                <div className="performance-bars">
                  {[
                    { label: 'TTFB', value: result.performance.ttfbMs, max: 1000 },
                    { label: 'Total', value: result.performance.totalTimeMs, max: 5000 },
                    { label: 'DNS', value: result.performance.dnsLookupMs ?? 0, max: 500 },
                    { label: 'TCP', value: result.performance.tcpConnectMs ?? 0, max: 500 },
                    { label: 'TLS', value: result.performance.tlsHandshakeMs ?? 0, max: 500 },
                  ].map(({ label, value, max }) => (
                    <div key={label} className="perf-bar-row">
                      <span className="perf-label">{label}</span>
                      <div className="progress">
                        <div
                          className={`progress-fill ${value > max * 0.7 ? 'danger' : value > max * 0.4 ? 'warning' : 'success'}`}
                          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="perf-value">{value}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'findings' && (
              <div className="detail-section">
                {/* Summary */}
                <div className="findings-summary">
                  <span className="badge badge-critical">{findingCounts.critical} Critical</span>
                  <span className="badge badge-high">{findingCounts.high} High</span>
                  <span className="badge badge-medium">{findingCounts.medium} Medium</span>
                  <span className="badge badge-low">{findingCounts.low} Low</span>
                </div>

                {findings.length === 0 ? (
                  <div className="empty-mini">
                    <span className="text-success text-lg">✓ No findings — great job!</span>
                  </div>
                ) : (
                  <div className="findings-list">
                    {findings.map((f) => (
                      <div key={f.id} className="finding-item">
                        <div className="finding-header">
                          <span className={`badge ${getSeverityBadge(f.severity)}`}>
                            {f.severity}
                          </span>
                          <span className="finding-category">{f.category}</span>
                        </div>
                        <h4 className="finding-title">{f.title}</h4>
                        <p className="finding-desc">{f.description}</p>
                        {f.recommendation && (
                          <p className="finding-recommendation">💡 {f.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export buttons */}
          <div className="modal-actions">
            <a
              href={`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4200'}/reports/scan/${scan.id}?format=html`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              📄 HTML Report
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4200'}/reports/scan/${scan.id}?format=markdown`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              📝 Markdown
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4200'}/reports/scan/${scan.id}?format=json`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              { } JSON
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
