import { useState } from 'react'
import { api } from '../api/client'
import type { RepoScanResult } from '../api/client'
import { useToast } from '../hooks/useToast'
import ScoreRing from './ScoreRing'

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export default function GitHubScannerPanel() {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RepoScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setFilterSeverity(null)
    setLoading(true)

    try {
      const data = await api.scanRepo({
        owner,
        repo,
        branch: branch || undefined,
      })
      setResult(data as unknown as RepoScanResult)
      success(`Scanned ${data.owner}/${data.repo} — Score: ${data.score}/100`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const filteredFindings = result?.findings
    ?.filter(f => !filterSeverity || f.severity === filterSeverity)
    .sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)) ?? []

  const getSeverityBadge = (sev: string) => {
    const map: Record<string, string> = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    }
    return map[sev] ?? 'badge-muted'
  }

  const topLanguages = result?.files ? Object.entries(result.files.byLanguage).sort((a, b) => b[1] - a[1]).slice(0, 5) : []

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>GitHub Repo Scanner</h2>
      </div>
      <p className="panel-desc">
        Analyze repository for security vulnerabilities, code quality issues, and anti-patterns.
      </p>

      <form onSubmit={handleSubmit} className="github-form">
        <div className="form-row">
          <input
            className="input"
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner (e.g., facebook)"
            required
          />
          <input
            className="input"
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="Repo (e.g., react)"
            required
          />
          <input
            className="input"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch (default: main)"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <><span className="spinner" /> Scanning…</>
          ) : '🔎 Scan Repo'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="result-card card mt-6">
          <div className="result-header">
            <div className="flex items-center gap-4">
              <ScoreRing score={result.score ?? 0} size={64} strokeWidth={5} />
              <div>
                <h3>{result.owner}/{result.repo}</h3>
                <span className="text-muted text-sm">
                  Branch: {result.branch} • {result.files?.total ?? 0} files
                </span>
              </div>
            </div>
          </div>

          {/* Language distribution */}
          {topLanguages.length > 0 && (
            <div className="language-bar">
              {topLanguages.map(([lang, count]) => (
                <div key={lang} className="language-chip">
                  <span className="language-name">{lang}</span>
                  <span className="language-count">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Score Overview */}
          <div className="result-overview">
            <ScoreRing score={result.score ?? 0} />
            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-label">Critical</span>
                <strong className={(result.summary?.critical ?? 0) > 0 ? 'text-danger' : ''}>{result.summary?.critical ?? 0}</strong>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">High</span>
                <strong className={(result.summary?.high ?? 0) > 0 ? 'text-warning' : ''}>{result.summary?.high ?? 0}</strong>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">Medium</span>
                <strong>{result.summary?.medium ?? 0}</strong>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">Low</span>
                <strong>{result.summary?.low ?? 0}</strong>
              </div>
            </div>
          </div>

          {/* Severity filter */}
          <div className="severity-filters">
            <button
              className={`btn btn-sm ${!filterSeverity ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterSeverity(null)}
            >
              All ({result.findings?.length ?? 0})
            </button>
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <button
                key={sev}
                className={`btn btn-sm ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterSeverity(sev)}
              >
                {sev.charAt(0).toUpperCase() + sev.slice(1)} ({result.summary?.[sev] ?? 0})
              </button>
            ))}
          </div>

          {/* Findings list */}
          {filteredFindings.length > 0 ? (
            <div className="findings-list">
              {filteredFindings.map((finding, i) => (
                <div key={i} className="finding-item">
                  <div className="finding-header">
                    <span className={`badge ${getSeverityBadge(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    <span className="finding-category">{finding.category}</span>
                  </div>
                  <h4 className="finding-title">{finding.title}</h4>
                  <p className="finding-desc">{finding.description}</p>
                  {finding.evidence && (
                    <code className="finding-evidence">{finding.evidence}</code>
                  )}
                  {finding.recommendation && (
                    <p className="finding-recommendation">
                      💡 {finding.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-mini">
              <span className="text-success text-lg">✓ No {filterSeverity} findings!</span>
            </div>
          )}

          <div className="result-detail mt-4">
            <span className="text-muted text-sm">Scanned: {result.scannedAt ? new Date(result.scannedAt).toLocaleString() : '—'}</span>
          </div>
        </div>
      )}
    </section>
  )
}
