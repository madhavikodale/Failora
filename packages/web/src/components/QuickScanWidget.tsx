import { useState } from 'react'
import { api } from '../api/client'

interface QuickScanResult {
  score: number
  isUp: boolean
  responseTimeMs?: number
  sslValid?: boolean
  findings: Array<{ severity: string; title: string }>
  topFindings: Array<{ severity: string; title: string }>
}

interface QuickScanWidgetProps {
  onGetStarted: () => void
}

export default function QuickScanWidget({ onGetStarted }: QuickScanWidgetProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuickScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Quick public scan — no auth required, read-only checks
      const scan = await api.createScan({ url: url.trim(), authorized: true })
      
      // Poll for result (quick scan usually completes in ~10s)
      const pollInterval = setInterval(async () => {
        try {
          const updated = await api.getScan(scan.id)
          if (updated.status === 'completed') {
            clearInterval(pollInterval)
            const parsed = JSON.parse(updated.result || '{}')
            setResult({
              score: updated.overall_score ?? 0,
              isUp: parsed.health?.isUp ?? false,
              responseTimeMs: parsed.health?.responseTimeMs,
              sslValid: parsed.ssl?.valid,
              findings: parsed.findings ?? [],
              topFindings: (parsed.findings ?? []).slice(0, 3),
            })
            setLoading(false)
          } else if (updated.status === 'failed') {
            clearInterval(pollInterval)
            setError('Scan failed. Please try again.')
            setLoading(false)
          }
        } catch {
          clearInterval(pollInterval)
          setError('Failed to get scan result.')
          setLoading(false)
        }
      }, 2000)

      // Timeout after 30s
      setTimeout(() => {
        clearInterval(pollInterval)
        if (loading) {
          setError('Scan timed out. Try again or sign up for full analysis.')
          setLoading(false)
        }
      }, 30000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan')
      setLoading(false)
    }
  }

  const scoreColor = (score: number) =>
    score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="quick-scan-widget" view-item="from-center">
      <div className="qs-header">
        <span className="qs-icon">⚡</span>
        <h2>Quick Security Check</h2>
        <p>Enter your URL for an instant health & security snapshot</p>
      </div>

      <form onSubmit={handleScan} className="qs-form">
        <input
          type="url"
          placeholder="https://your-site.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
          className="qs-input"
        />
        <button type="submit" disabled={loading} className="qs-btn">
          {loading ? 'Scanning...' : 'Scan Now'}
        </button>
      </form>

      {error && <div className="qs-error">{error}</div>}

      {result && (
        <div className="qs-result">
          <div className="qs-score-row">
            <div className="qs-score" style={{ color: scoreColor(result.score) }}>
              {result.score}
              <small>/100</small>
            </div>
            <div className="qs-metrics">
              <div className="qs-metric">
                <span className={result.isUp ? 'text-success' : 'text-danger'}>
                  {result.isUp ? '● Up' : '● Down'}
                </span>
              </div>
              {result.responseTimeMs && (
                <div className="qs-metric">{result.responseTimeMs}ms</div>
              )}
              <div className="qs-metric">
                SSL: {result.sslValid ? '✓' : '✗'}
              </div>
              <div className="qs-metric">
                {result.findings.length} findings
              </div>
            </div>
          </div>

          {result.topFindings.length > 0 && (
            <div className="qs-findings">
              <h4>Top findings:</h4>
              {result.topFindings.map((f, i) => (
                <div key={i} className="qs-finding">
                  <span className={`qs-sev qs-sev-${f.severity}`}>{f.severity}</span>
                  <span>{f.title}</span>
                </div>
              ))}
            </div>
          )}

          <button className="qs-cta" onClick={onGetStarted}>
            Get full analysis →
          </button>
        </div>
      )}
    </div>
  )
}
