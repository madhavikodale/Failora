import { useState } from 'react'
import { api } from '../api/client'
import type { ScanResult } from '../api/client'

interface ScanPanelProps {
  onScanCreated: (scan: ScanResult) => void
}

export default function ScanPanel({ onScanCreated }: ScanPanelProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const scan = await api.createScan({ url })
      onScanCreated(scan)
      setSuccess(`Scan started for ${url}`)
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>URL Scanner</h2>
      </div>
      <p className="panel-desc">
        Comprehensive scan: health, SSL, DNS, security headers, performance, broken links.
      </p>

      <form onSubmit={handleSubmit} className="scan-form">
        <div className="form-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Scanning…' : '🔍 Scan'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
    </section>
  )
}
