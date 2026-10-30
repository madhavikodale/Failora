import { useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'

interface TestResult {
  endpoint?: string
  method?: string
  isHealthy?: boolean
  statusCode?: number
  responseTimeMs?: number
  expectedStatusCodes?: number[]
  timeoutMs?: number
  responseSizeBytes?: number
  checkedAt?: string
  error?: string
}

export default function APITesterPanel() {
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      let parsedHeaders: Record<string, string> | undefined
      if (headers.trim()) {
        parsedHeaders = JSON.parse(headers)
      }

      let parsedBody: unknown
      if (body.trim()) {
        parsedBody = JSON.parse(body)
      }

      const data = await api.testAPI({
        name: 'Manual Test',
        url,
        method,
        headers: parsedHeaders,
        body: parsedBody,
      })
      setResult(data as TestResult)
      success('API test completed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Test failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (code?: number) => {
    if (!code) return null
    if (code >= 200 && code < 300) return <span className="badge badge-success">{code}</span>
    if (code >= 300 && code < 400) return <span className="badge badge-info">{code}</span>
    if (code >= 400 && code < 500) return <span className="badge badge-warning">{code}</span>
    return <span className="badge badge-danger">{code}</span>
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>API Tester</h2>
      </div>
      <p className="panel-desc">Test API endpoints for health and response validation.</p>

      <form onSubmit={handleSubmit} className="api-test-form">
        <div className="form-row">
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>PATCH</option>
          </select>
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            required
          />
        </div>
        <div className="form-group">
          <label className="label">Headers (JSON, optional)</label>
          <textarea
            className="textarea"
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            placeholder='{"Authorization": "Bearer token"}'
            rows={2}
          />
        </div>
        <div className="form-group">
          <label className="label">Body (JSON, optional)</label>
          <textarea
            className="textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <><span className="spinner" /> Testing…</>
          ) : '🚀 Test API'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="result-card card mt-6">
          <div className="result-header">
            <h3>Test Result</h3>
            {result.isHealthy !== undefined && (
              <span className={`badge ${result.isHealthy ? 'badge-success' : 'badge-danger'}`}>
                {result.isHealthy ? 'Healthy' : 'Unhealthy'}
              </span>
            )}
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <span className="result-stat-label">Status</span>
              {getStatusBadge(result.statusCode)}
            </div>
            <div className="result-stat">
              <span className="result-stat-label">Response Time</span>
              <strong>{result.responseTimeMs}ms</strong>
            </div>
            <div className="result-stat">
              <span className="result-stat-label">Size</span>
              <strong>{result.responseSizeBytes} B</strong>
            </div>
            <div className="result-stat">
              <span className="result-stat-label">Method</span>
              <span className="badge badge-info">{result.method}</span>
            </div>
          </div>

          {result.expectedStatusCodes && (
            <div className="result-detail">
              <span className="text-muted text-sm">Expected: {result.expectedStatusCodes.join(', ')}</span>
            </div>
          )}

          {result.checkedAt && (
            <div className="result-detail">
              <span className="text-muted text-sm">Checked: {new Date(result.checkedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
