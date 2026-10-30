import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Target, ScanResult, Monitor, RepoScanResult, RepoScanFinding } from '../api/client'
import ThemeToggle from './ThemeToggle'

interface ConsolePageProps {
  onBack: () => void
  user?: { id: string; email: string; name: string } | null
}

// ── Types for real data ─────────────────────────────────────────────

interface ScanResultData {
  health?: { isUp?: boolean; statusCode?: number; responseTimeMs?: number }
  ssl?: { valid?: boolean; daysUntilExpiry?: number; issuer?: string }
  security?: { score?: number; missingHeaders?: string[] }
  performance?: { score?: number; loadTimeMs?: number }
  dns?: { resolved?: boolean; ip?: string }
  overallScore?: number
}

// ── Component ────────────────────────────────────────────────────────

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, flex: 'none' }}>
    <path d={d} />
  </svg>
)

const ICONS = {
  overview: 'M3 3h7v8H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 15h7v6H3z',
  websites: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
  repos: 'M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 00-6 0C6.8 2.2 5.8 2.5 5.8 2.5a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004.4 8.9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  issues: 'M12 3l9 16H3zM12 10v4M12 17v.5',
  testing: 'M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3M7.5 15h9',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  search: 'M11 11m-7 0a7 7 0 1114 0a7 7 0 01-14 0M20 20l-3.5-3.5',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0',
  alert: 'M12 3l9 16H3zM12 10v4M12 17v.5',
  check: 'M5 13l4 4L19 7',
  clock: 'M12 7v5l3 3',
}

// ── Component ────────────────────────────────────────────────────────

type View = 'overview' | 'websites' | 'repos' | 'issues' | 'testing' | 'reports' | 'settings'

export default function ConsolePage({ onBack, user }: ConsolePageProps) {
  const [activeView, setActiveView] = useState<View>('overview')
  const [sevFilter, setSevFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedIssue, setSelectedIssue] = useState<RepoScanFinding | null>(null)

  // ── Real data state ───────────────────────────────────────────────
  const [targets, setTargets] = useState<Target[]>([])
  const [scans, setScans] = useState<ScanResult[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [reports, setReports] = useState<Array<{ id: number; name: string; period: string; format: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Website form
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [scanningSite, setScanningSite] = useState(false)

  // Repo form
  const [repoUrl, setRepoUrl] = useState('')
  const [scanningRepo, setScanningRepo] = useState(false)
  const [repoResult, setRepoResult] = useState<RepoScanResult | null>(null)

  // ── Fetch real data ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, s, m, r] = await Promise.all([
        api.listTargets().catch(() => []),
        api.listScans().catch(() => []),
        api.listMonitors().catch(() => []),
        api.listReports().catch(() => []),
      ])
      setTargets(t)
      setScans(s)
      setMonitors(m)
      setReports(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Handlers ──────────────────────────────────────────────────────
  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteUrl.trim()) return
    setScanningSite(true)
    try {
      await api.createTarget({ name: siteName.trim() || siteUrl.trim(), url: siteUrl.trim() })
      await api.createScan({ url: siteUrl.trim() })
      setSiteUrl('')
      setSiteName('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website')
    } finally {
      setScanningSite(false)
    }
  }

  const handleScanRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoUrl.trim()) return
    setScanningRepo(true)
    setRepoResult(null)
    try {
      // Parse GitHub URL: https://github.com/owner/repo
      const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        setError('Invalid GitHub URL. Expected format: https://github.com/owner/repo')
        return
      }
      const [, owner, repo] = match
      const result = await api.scanRepo({ owner, repo: repo.replace(/\.git$/, '') })
      setRepoResult(result)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository scan failed')
    } finally {
      setScanningRepo(false)
    }
  }

  // ── Derived metrics from real data ────────────────────────────────
  const totalTargets = targets.length
  const completedScans = scans.filter(s => s.status === 'completed').length
  const failedScans = scans.filter(s => s.status === 'failed').length
  const activeMonitorCount = monitors.filter(m => m.is_active).length
  const avgScore = scans.length > 0
    ? Math.round(scans.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / scans.length)
    : 0

  // Extract real findings from repo scans (stored in scans with repo URLs)
  const realFindings: RepoScanFinding[] = scans
    .filter(s => s.result && s.url.includes('github.com'))
    .flatMap(s => {
      try {
        const parsed = JSON.parse(s.result!) as RepoScanResult
        return parsed.findings ?? []
      } catch { return [] }
    })

  const filteredIssues = realFindings.filter(i => {
    const matchSev = sevFilter === 'all' || i.severity === sevFilter
    return matchSev
  })

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: ICONS.overview },
    { id: 'websites', label: 'Website monitoring', icon: ICONS.websites },
    { id: 'repos', label: 'Repository scanner', icon: ICONS.repos },
    { id: 'issues', label: 'Issues & findings', icon: ICONS.issues },
    { id: 'testing', label: 'AI reliability tests', icon: ICONS.testing },
    { id: 'reports', label: 'Reports & history', icon: ICONS.reports },
    { id: 'settings', label: 'Integrations & settings', icon: ICONS.settings },
  ]

  const statusBadge = (status: string) => {
    if (status === 'up') return <span className="badge b-ok">UP</span>
    if (status === 'degraded') return <span className="badge b-warn">DEGRADED</span>
    return <span className="badge b-bad">DOWN</span>
  }

  const scanStatusBadge = (status: string) => {
    if (status === 'completed') return <span className="badge b-ok">COMPLETED</span>
    if (status === 'failed') return <span className="badge b-bad">FAILED</span>
    return <span className="badge b-info">RUNNING</span>
  }

  return (
    <div className="console-app">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="console-side">
        <button className="console-brand" onClick={onBack}>
          <span className="brand-mark">
            <svg viewBox="0 0 16 16" fill="none" stroke="#04111f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M3 4l4 4-4 4" /><path d="M9 12h4" />
            </svg>
          </span>
          <span>Failora</span>
        </button>

        <nav className="console-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`console-nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <Icon d={item.icon} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="console-side-foot">
          <b>Live mode</b>
          Connected to real API. Data persists in SQLite.
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="console-main">
        {/* Topbar */}
        <div className="console-topbar">
          <label className="console-search">
            <Icon d={ICONS.search} size={16} />
            <input type="text" placeholder="Search projects, issues, scenarios" />
          </label>
          <div className="console-top-right">
            <ThemeToggle />
            <button className="console-iconbtn" title="Notifications">
              <Icon d={ICONS.bell} size={17} />
            </button>
            <div className="console-avatar">
              {user?.name?.charAt(0).toUpperCase() ?? 'M'}{user?.name?.split(' ')[1]?.charAt(0).toUpperCase() ?? 'K'}
            </div>
          </div>
        </div>

        {/* ── 1. OVERVIEW ─────────────────────────────────────── */}
        {activeView === 'overview' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Overview</h1>
                <p>Real projects, scans and monitoring at a glance.</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="console-card" style={{ marginBottom: 18, borderColor: 'var(--red)' }}>
                <p style={{ color: 'var(--red)', margin: 0 }}>{error}</p>
              </div>
            )}

            <div className="grid grid-kpi">
              <div className="console-card kpi-card">
                <div className="kpi-label">Targets</div>
                <div className="kpi-val">{totalTargets}</div>
                <div className="kpi-delta">{targets.length > 0 ? 'Monitored endpoints' : 'No targets yet'}</div>
              </div>
              <div className="console-card kpi-card">
                <div className="kpi-label">Scans completed</div>
                <div className="kpi-val">{completedScans}</div>
                <div className="kpi-bar"><i style={{ width: scans.length > 0 ? `${(completedScans / scans.length) * 100}%` : '0%' }} /></div>
              </div>
              <div className="console-card kpi-card">
                <div className="kpi-label">Scans failed</div>
                <div className="kpi-val">{failedScans}</div>
                <div className="kpi-delta bad">{scans.length > 0 ? `${Math.round((failedScans / scans.length) * 100)}% failure rate` : 'No scans yet'}</div>
              </div>
              <div className="console-card kpi-card">
                <div className="kpi-label">Active monitors</div>
                <div className="kpi-val">{activeMonitorCount}</div>
                <div className="kpi-delta">{monitors.length > 0 ? `${monitors.length} total` : 'None configured'}</div>
              </div>
              <div className="console-card kpi-card">
                <div className="kpi-label">Avg scan score</div>
                <div className="kpi-val">{avgScore > 0 ? avgScore : '—'}{avgScore > 0 && <small>/100</small>}</div>
                <div className="kpi-bar"><i style={{ width: `${avgScore}%` }} /></div>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="console-card">
                <div className="card-header">
                  <h3>Recent scans</h3>
                  <span className="dim-text">{scans.length} total</span>
                </div>
                {scans.length === 0 ? (
                  <p className="dim-text" style={{ textAlign: 'center', padding: 24 }}>No scans yet. Add a website to get started.</p>
                ) : (
                  <div className="activity-list">
                    {scans.slice(0, 5).map(scan => {
                      let health: ScanResultData['health']
                      let ssl: ScanResultData['ssl']
                      try {
                        const parsed = JSON.parse(scan.result ?? '{}') as ScanResultData
                        health = parsed.health
                        ssl = parsed.ssl
                      } catch { /* ignore */ }
                      return (
                        <div key={scan.id} className="activity-item">
                          <span className="activity-icon">{scan.status === 'completed' ? '🟢' : scan.status === 'failed' ? '🔴' : '🟡'}</span>
                          <span className="activity-text">
                            {scan.url}
                            {health?.responseTimeMs != null && ` — ${health.responseTimeMs}ms`}
                            {ssl && ` — SSL ${ssl.valid ? 'valid' : 'invalid'}`}
                          </span>
                          <span className="activity-time">{new Date(scan.created_at).toLocaleDateString()}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="console-card">
                <div className="card-header">
                  <h3>Active monitors</h3>
                  <span className="dim-text">{monitors.length} configured</span>
                </div>
                {monitors.length === 0 ? (
                  <p className="dim-text" style={{ textAlign: 'center', padding: 24 }}>No monitors yet.</p>
                ) : (
                  <div className="activity-list">
                    {monitors.slice(0, 5).map(m => (
                      <div key={m.id} className="activity-item">
                        <span className="activity-icon">{m.is_active ? '💓' : '⏸️'}</span>
                        <span className="activity-text">{m.name} ({m.url})</span>
                        <span className="activity-time">{m.interval_seconds}s interval</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── 2. WEBSITE MONITORING ───────────────────────────── */}
        {activeView === 'websites' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Website monitoring</h1>
                <p>Track uptime, latency and SSL for your websites.</p>
              </div>
            </div>

            <div className="console-card" style={{ marginBottom: 18 }}>
              <div className="card-header"><h3>Add website</h3></div>
              <form onSubmit={handleAddWebsite} className="repo-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Site name (optional)"
                    className="form-input"
                    style={{ maxWidth: 200 }}
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                  />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    className="form-input"
                    value={siteUrl}
                    onChange={e => setSiteUrl(e.target.value)}
                    required
                  />
                  <button className="btn-primary" type="submit" disabled={scanningSite}>
                    {scanningSite ? 'Scanning...' : 'Add & scan'}
                  </button>
                </div>
                <p className="note-text">Adds the URL as a target and starts a real scan (HTTP, SSL, DNS, performance).</p>
              </form>
            </div>

            {targets.length === 0 ? (
              <div className="console-card">
                <p className="dim-text" style={{ textAlign: 'center', padding: 32 }}>
                  No websites yet. Add one above to start monitoring.
                </p>
              </div>
            ) : (
              <div className="grid grid-3">
                {targets.map(t => {
                  const latestScan = scans.find(s => s.url === t.url)
                  let scanData: ScanResultData | null = null
                  if (latestScan?.result) {
                    try { scanData = JSON.parse(latestScan.result) } catch { /* ignore */ }
                  }
                  const isUp = scanData?.health?.isUp ?? false
                  const latency = scanData?.health?.responseTimeMs
                  const sslValid = scanData?.ssl?.valid
                  const sslDays = scanData?.ssl?.daysUntilExpiry

                  return (
                    <div key={t.id} className="console-card site-card">
                      <div className="card-header">
                        <h3>{t.name}</h3>
                        {statusBadge(isUp ? 'up' : 'down')}
                      </div>
                      <div className="site-metrics">
                        <div className="site-metric">
                          <span className="metric-label">URL</span>
                          <span className="metric-val mono-text" style={{ fontSize: 12 }}>{t.url}</span>
                        </div>
                        <div className="site-metric">
                          <span className="metric-label">Latency</span>
                          <span className="metric-val">{latency != null ? `${latency}ms` : '—'}</span>
                        </div>
                        <div className="site-metric">
                          <span className="metric-label">SSL</span>
                          <span className="metric-val" style={{ color: sslValid ? 'var(--green)' : 'var(--red)' }}>
                            {sslValid != null ? (sslValid ? `Valid${sslDays ? ` (${sslDays}d)` : ''}` : 'Invalid') : '—'}
                          </span>
                        </div>
                        <div className="site-metric">
                          <span className="metric-label">Last scan</span>
                          <span className="metric-val">
                            {latestScan ? new Date(latestScan.created_at).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {scans.length > 0 && (
              <div className="console-card" style={{ marginTop: 18 }}>
                <div className="card-header">
                  <h3>Scan results</h3>
                  <span className="dim-text">{scans.length} scans</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>URL</th><th>Status</th><th>Score</th><th>SSL</th><th>Latency</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {scans.slice(0, 10).map(scan => {
                        let d: ScanResultData | null = null
                        try { d = scan.result ? JSON.parse(scan.result) : null } catch { /* ignore */ }
                        return (
                          <tr key={scan.id}>
                            <td className="mono-text">{scan.url}</td>
                            <td>{scanStatusBadge(scan.status)}</td>
                            <td>{scan.overall_score ?? '—'}</td>
                            <td>{d?.ssl?.valid != null ? (d.ssl.valid ? '✅' : '❌') : '—'}</td>
                            <td>{d?.health?.responseTimeMs != null ? `${d.health.responseTimeMs}ms` : '—'}</td>
                            <td>{new Date(scan.created_at).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 3. REPOSITORY SCANNER ───────────────────────────── */}
        {activeView === 'repos' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Repository scanner</h1>
                <p>Paste a GitHub URL to analyze code quality, security gaps, error handling and tests.</p>
              </div>
            </div>

            <div className="console-card" style={{ marginBottom: 18 }}>
              <div className="card-header"><h3>Scan a repository</h3></div>
              <form onSubmit={handleScanRepo} className="repo-form">
                <div className="form-row">
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo"
                    className="form-input"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    required
                  />
                  <button className="btn-primary" type="submit" disabled={scanningRepo}>
                    {scanningRepo ? 'Scanning...' : 'Start scan'}
                  </button>
                </div>
                <p className="note-text">Public repositories only. Private repo support requires GitHub token (coming soon).</p>
              </form>
            </div>

            {repoResult && (
              <div className="console-card" style={{ marginBottom: 18 }}>
                <div className="card-header">
                  <h3>{repoResult.owner}/{repoResult.repo}</h3>
                  <span className="dim-text">branch: {repoResult.branch ?? 'main'}</span>
                </div>

                {repoResult.score != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div className="kpi-val" style={{ fontSize: 48 }}>{repoResult.score}<small>/100</small></div>
                    <div className="kpi-bar" style={{ flex: 1 }}><i style={{ width: `${repoResult.score}%` }} /></div>
                  </div>
                )}

                {repoResult.summary && typeof repoResult.summary === 'object' && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <span className="sev-badge critical">Critical: {repoResult.summary.critical}</span>
                    <span className="sev-badge high">High: {repoResult.summary.high}</span>
                    <span className="sev-badge medium">Medium: {repoResult.summary.medium}</span>
                    <span className="sev-badge low">Low: {repoResult.summary.low}</span>
                  </div>
                )}

                {repoResult.findings && repoResult.findings.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Severity</th><th>Finding</th><th>File</th><th>Line</th><th>Category</th></tr>
                      </thead>
                      <tbody>
                        {repoResult.findings.map((f, i) => (
                          <tr key={i} className="clickable" onClick={() => setSelectedIssue(f)}>
                            <td><span className={`sev-badge ${f.severity}`}>{f.severity.toUpperCase()}</span></td>
                            <td>{f.title}</td>
                            <td className="mono-text">{f.file ?? '—'}</td>
                            <td>{f.line ?? '—'}</td>
                            <td>{f.category ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="dim-text" style={{ textAlign: 'center', padding: 24 }}>No findings detected.</p>
                )}
              </div>
            )}

            {selectedIssue && repoResult && (
              <div className="console-card issue-detail">
                <div className="card-header">
                  <h3>{selectedIssue.title}</h3>
                  <span className={`sev-badge ${selectedIssue.severity}`}>{selectedIssue.severity.toUpperCase()}</span>
                </div>
                <div className="detail-grid">
                  <div>
                    <h4>Location</h4>
                    <p className="mono-text">{selectedIssue.file}{selectedIssue.line ? `:${selectedIssue.line}` : ''}</p>
                  </div>
                  <div>
                    <h4>Category</h4>
                    <p>{selectedIssue.category ?? '—'}</p>
                  </div>
                  <div>
                    <h4>Impact</h4>
                    <p>{selectedIssue.impact ?? '—'}</p>
                  </div>
                  <div>
                    <h4>Recommendation</h4>
                    <p>{selectedIssue.recommendation ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 4. ISSUES & FINDINGS ────────────────────────────── */}
        {activeView === 'issues' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Issues &amp; findings</h1>
                <p>Real findings from repository scans. Filter by severity.</p>
              </div>
            </div>

            <div className="console-card">
              <div className="card-header">
                <div className="chips">
                  {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                    <button
                      key={s}
                      className={`chip ${sevFilter === s ? 'active' : ''}`}
                      onClick={() => setSevFilter(s)}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="Open">Open</option>
                  <option value="In progress">In progress</option>
                  <option value="Fixed">Fixed</option>
                </select>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Severity</th><th>Issue</th><th>Location</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue, idx) => (
                      <tr
                        key={idx}
                        className={`clickable ${selectedIssue?.title === issue.title ? 'selected' : ''}`}
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <td><span className={`sev-badge ${issue.severity}`}>{issue.severity.toUpperCase()}</span></td>
                        <td>{issue.title}</td>
                        <td className="mono-text">{issue.file ?? '—'}</td>
                        <td>
                          <span className={`badge ${issue.severity === 'critical' ? 'b-bad' : issue.severity === 'high' ? 'b-warn' : 'b-info'}`}>
                            {issue.severity}
                          </span>
                        </td>
                        <td><button className="btn-ghost btn-sm">Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedIssue && (
              <div className="console-card issue-detail">
                <div className="card-header">
                  <h3>{selectedIssue.title}</h3>
                  <span className={`sev-badge ${selectedIssue.severity}`}>{selectedIssue.severity.toUpperCase()}</span>
                </div>
                <div className="detail-grid">
                  <div>
                    <h4>Location</h4>
                    <p className="mono-text">{selectedIssue.file ?? '—'}</p>
                  </div>
                  <div>
                    <h4>Category</h4>
                    <p>{selectedIssue.category ?? '—'}</p>
                  </div>
                  <div>
                    <h4>Impact</h4>
                    <p>{selectedIssue.impact ?? '—'}</p>
                  </div>
                  <div>
                    <h4>Recommendation</h4>
                    <p>{selectedIssue.recommendation ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 5. AI RELIABILITY TESTS ─────────────────────────── */}
        {activeView === 'testing' && (
          <section>
            <div className="view-header">
              <div>
                <h1>AI reliability tests</h1>
                <p>Chaos engineering scenarios against your API endpoints.</p>
              </div>
              <span className="badge b-info">COMING SOON</span>
            </div>

            <div className="console-card">
              <p className="dim-text" style={{ textAlign: 'center', padding: 32 }}>
                Chaos engineering tests are not yet implemented in the backend. 
                This section will be enabled once the reliability testing API is available.
              </p>
            </div>
          </section>
        )}

        {/* ── 6. REPORTS & HISTORY ────────────────────────────── */}
        {activeView === 'reports' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Reports &amp; history</h1>
                <p>Generated reports and past scan results.</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="console-card">
                <div className="card-header"><h3>Reports</h3></div>
                <div className="list">
                  {reports.length === 0 ? (
                    <p className="dim-text" style={{ textAlign: 'center', padding: 24 }}>No reports yet.</p>
                  ) : (
                    reports.map(r => (
                      <div key={r.id} className="list-item">
                        <span className="list-icon" style={{ background: 'rgba(59,130,246,0.16)', color: '#93c5fd' }}>
                          <Icon d={ICONS.reports} size={16} />
                        </span>
                        <div className="list-text">
                          <div className="list-title">{r.name}</div>
                          <div className="list-sub">{r.period}</div>
                        </div>
                        <span className="badge b-info">{r.format}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="console-card">
                <div className="card-header"><h3>Scan history</h3></div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>URL</th><th>Status</th><th>Score</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {scans.length === 0 ? (
                        <tr><td colSpan={4} className="dim-text" style={{ textAlign: 'center' }}>No scans yet.</td></tr>
                      ) : (
                        scans.map(s => (
                          <tr key={s.id}>
                            <td className="mono-text">{s.url}</td>
                            <td>{scanStatusBadge(s.status)}</td>
                            <td>
                              <span style={{
                                color: s.overall_score && s.overall_score >= 80 ? 'var(--green)' : s.overall_score && s.overall_score >= 60 ? 'var(--amber)' : 'var(--red)',
                                fontWeight: 600
                              }}>{s.overall_score ?? '—'}</span>
                            </td>
                            <td>{new Date(s.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 7. SETTINGS ─────────────────────────────────────── */}
        {activeView === 'settings' && (
          <section>
            <div className="view-header">
              <div>
                <h1>Integrations &amp; settings</h1>
                <p>Configure your Failora console.</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="console-card">
                <div className="card-header"><h3>Notifications</h3></div>
                {[
                  { label: 'Email alerts', desc: 'Get notified when sites go down' },
                  { label: 'Slack integration', desc: 'Post alerts to Slack channel' },
                  { label: 'Webhook URL', desc: 'Send events to custom endpoint' },
                  { label: 'Daily digest', desc: 'Receive summary every morning' },
                ].map(item => (
                  <div key={item.label} className="toggle-row">
                    <div>
                      <div className="toggle-label">{item.label}</div>
                      <div className="toggle-desc">{item.desc}</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked={item.label === 'Email alerts'} />
                      <span />
                    </label>
                  </div>
                ))}
              </div>

              <div className="console-card">
                <div className="card-header"><h3>Account</h3></div>
                <div className="account-info">
                  <div className="account-avatar">
                    {user?.name?.charAt(0).toUpperCase() ?? 'M'}{user?.name?.split(' ')[1]?.charAt(0).toUpperCase() ?? 'K'}
                  </div>
                  <div>
                    <div className="account-name">{user?.name ?? 'Madhavi Kodale'}</div>
                    <div className="account-email">{user?.email ?? 'madhavikodale@example.com'}</div>
                  </div>
                </div>
                <div className="account-actions">
                  <button className="btn-ghost">Edit profile</button>
                  <button className="btn-ghost" onClick={onBack}>Sign out</button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
