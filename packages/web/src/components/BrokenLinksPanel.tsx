import { useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'

interface BrokenLink {
  url: string
  statusCode?: number
  statusText?: string
  anchorText?: string
}

interface LinkCheckResult {
  pageUrl: string
  totalLinks: number
  brokenLinks: BrokenLink[]
  checkedAt: string
}

export default function BrokenLinksPanel() {
  const [url, setUrl] = useState('')
  const [maxLinks, setMaxLinks] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LinkCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const data = await api.checkLinks({ url, max_links: maxLinks }) as LinkCheckResult
      setResult(data)
      success(`Checked ${data.totalLinks} links — ${data.brokenLinks.length} broken`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const brokenPercentage = result ? Math.round((result.brokenLinks.length / Math.max(result.totalLinks, 1)) * 100) : 0

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Broken Links Checker</h2>
      </div>
      <p className="panel-desc">Find broken links on your website before your users do.</p>

      <form onSubmit={handleSubmit} className="links-form">
        <div className="form-row">
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
          <input
            className="input"
            type="number"
            min={1}
            max={500}
            value={maxLinks}
            onChange={(e) => setMaxLinks(parseInt(e.target.value, 10))}
            title="Max links to check"
            placeholder="Max links"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <><span className="spinner" /> Checking…</>
          ) : '🔗 Check Links'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="result-card card mt-6">
          <div className="result-header">
            <h3>Link Check Results</h3>
            <span className={`badge ${brokenPercentage > 10 ? 'badge-danger' : brokenPercentage > 0 ? 'badge-warning' : 'badge-success'}`}>
              {brokenPercentage}% broken
            </span>
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <span className="result-stat-label">Total Links</span>
              <strong>{result.totalLinks}</strong>
            </div>
            <div className="result-stat">
              <span className="result-stat-label">Broken</span>
              <strong className={result.brokenLinks.length > 0 ? 'text-danger' : 'text-success'}>
                {result.brokenLinks.length}
              </strong>
            </div>
            <div className="result-stat">
              <span className="result-stat-label">Healthy</span>
              <strong className="text-success">{result.totalLinks - result.brokenLinks.length}</strong>
            </div>
          </div>

          {result.brokenLinks.length > 0 && (
            <div className="broken-links-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Anchor</th>
                  </tr>
                </thead>
                <tbody>
                  {result.brokenLinks.map((link, i) => (
                    <tr key={i}>
                      <td className="font-mono text-sm">{link.url}</td>
                      <td>
                        <span className="badge badge-danger">
                          {link.statusCode ?? 'ERR'}
                        </span>
                      </td>
                      <td>{link.anchorText ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.brokenLinks.length === 0 && result.totalLinks > 0 && (
            <div className="empty-mini">
              <span className="text-success text-lg">✓ No broken links found!</span>
            </div>
          )}

          <div className="result-detail mt-4">
            <span className="text-muted text-sm">Checked: {new Date(result.checkedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </section>
  )
}
