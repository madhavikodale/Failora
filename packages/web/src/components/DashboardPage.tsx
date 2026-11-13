import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Target, ScanResult, Monitor, RepoScanResult, RepoScanFinding } from '../api/client'
import ThemeToggle from './ThemeToggle'
import NotificationCenter from './NotificationCenter'
import ScanComparison from './ScanComparison'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  Icon, ICONS, Button, Card, Badge, SevBadge, StatCard,
  Progress, Switch, EmptyState, HealthRing,
  BarChart, DonutChart, CommandPalette, Toast, StatusDot,
} from './ui'

interface DashboardPageProps {
  onBack: () => void
  user?: { id: string; email: string; name: string } | null
}

// ── Types ─────────────────────────────────────────────────────────────

interface ScanResultData {
  health?: { isUp?: boolean; statusCode?: number; responseTimeMs?: number }
  ssl?: { valid?: boolean; daysUntilExpiry?: number; issuer?: string }
  security?: { score?: number; missingHeaders?: string[] }
  performance?: { score?: number; loadTimeMs?: number }
  dns?: { resolved?: boolean; ip?: string }
  overallScore?: number
}

type View = 'overview' | 'websites' | 'repos' | 'issues' | 'testing' | 'reports' | 'settings' | 'compare'

// ── Component ─────────────────────────────────────────────────────────

export default function DashboardPage({ onBack, user }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<View>('overview')
  const [sevFilter, setSevFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedIssue, setSelectedIssue] = useState<RepoScanFinding | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

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

  // Settings state
  const [settings, setSettings] = useState({
    emailAlerts: true,
    slackIntegration: false,
    webhookUrl: false,
    dailyDigest: true,
  })

  // ── WebSocket real-time updates ─────────────────────────────────────
  const { connected: wsConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.event === 'scan:completed') {
        fetchData()
        setToast({ message: `Scan ${message.data.status}: ${message.data.url}`, type: message.data.status === 'completed' ? 'success' : 'warning' })
      }
      if (message.event === 'scan:started') {
        fetchData()
      }
    },
    onConnect: () => {
      console.log('[WS] Connected to real-time updates')
    },
    onDisconnect: () => {
      console.log('[WS] Disconnected')
    },
  })

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

  // ── Command palette keyboard shortcut ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
      setToast({ message: 'Website added and scan started', type: 'success' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website')
      setToast({ message: 'Failed to add website', type: 'error' })
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
      const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        setError('Invalid GitHub URL. Expected format: https://github.com/owner/repo')
        return
      }
      const [, owner, repo] = match
      const result = await api.scanRepo({ owner, repo: repo.replace(/\.git$/, '') })
      setRepoResult(result)
      await fetchData()
      setToast({ message: `Scanned ${owner}/${repo}`, type: 'success' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository scan failed')
      setToast({ message: 'Repository scan failed', type: 'error' })
    } finally {
      setScanningRepo(false)
    }
  }

  // ── Derived metrics ───────────────────────────────────────────────
  const totalTargets = targets.length
  const completedScans = scans.filter(s => s.status === 'completed').length
  const failedScans = scans.filter(s => s.status === 'failed').length
  const activeMonitorCount = monitors.filter(m => m.is_active).length
  const avgScore = scans.length > 0
    ? Math.round(scans.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / scans.length)
    : 0

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

  // ── Nav items ─────────────────────────────────────────────────────
  const navItems: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: ICONS.overview },
    { id: 'websites', label: 'Websites', icon: ICONS.websites, badge: totalTargets },
    { id: 'repos', label: 'Repositories', icon: ICONS.repos },
    { id: 'issues', label: 'Issues', icon: ICONS.issues, badge: realFindings.length },
    { id: 'testing', label: 'AI Testing', icon: ICONS.testing },
    { id: 'reports', label: 'Reports', icon: ICONS.reports },
    { id: 'compare', label: 'Compare', icon: ICONS.activity },
    { id: 'settings', label: 'Settings', icon: ICONS.settings },
  ]

  // ── Priority badge from severity ─────────────────────────────────
  const priorityBadge = (severity: string) => {
    const map: Record<string, { label: string; color: string }> = {
      critical: { label: 'P1', color: 'var(--danger)' },
      high: { label: 'P2', color: 'var(--warning)' },
      medium: { label: 'P3', color: 'var(--info)' },
      low: { label: 'P4', color: 'var(--text-muted)' },
    }
    const p = map[severity] ?? map.low
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: `${p.color}20`,
        color: p.color,
        marginLeft: 8,
      }}>
        {p.label}
      </span>
    )
  }

  // ── Verification status badge ────────────────────────────────────
  const verificationBadge = (status?: string) => {
    if (!status) return null
    const colors: Record<string, string> = {
      confirmed: 'var(--success)',
      rejected: 'var(--text-muted)',
      inconclusive: 'var(--warning)',
    }
    const labels: Record<string, string> = {
      confirmed: '✓ Verified',
      rejected: '✗ False Positive',
      inconclusive: '? Inconclusive',
    }
    const c = colors[status] ?? 'var(--text-muted)'
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: `${c}20`,
        color: c,
      }}>
        {labels[status] ?? status}
      </span>
    )
  }

  // ── Command palette actions ───────────────────────────────────────
  const commandActions = [
    { id: 'overview', label: 'Go to Overview', icon: ICONS.overview, shortcut: 'G O', group: 'Navigate' },
    { id: 'websites', label: 'Go to Websites', icon: ICONS.websites, shortcut: 'G W', group: 'Navigate' },
    { id: 'repos', label: 'Go to Repositories', icon: ICONS.repos, shortcut: 'G R', group: 'Navigate' },
    { id: 'issues', label: 'Go to Issues', icon: ICONS.issues, shortcut: 'G I', group: 'Navigate' },
    { id: 'testing', label: 'Go to AI Testing', icon: ICONS.testing, shortcut: 'G T', group: 'Navigate' },
    { id: 'reports', label: 'Go to Reports', icon: ICONS.reports, shortcut: 'G H', group: 'Navigate' },
    { id: 'settings', label: 'Go to Settings', icon: ICONS.settings, shortcut: 'G S', group: 'Navigate' },
    { id: 'refresh', label: 'Refresh Data', icon: ICONS.refresh, shortcut: '⌘ R', group: 'Actions' },
    { id: 'add-website', label: 'Add Website', icon: ICONS.plus, group: 'Actions' },
    { id: 'scan-repo', label: 'Scan Repository', icon: ICONS.repos, group: 'Actions' },
  ]

  const handleCommandSelect = (actionId: string) => {
    if (actionId === 'refresh') { fetchData(); return }
    if (actionId === 'add-website') { setActiveView('websites'); return }
    if (actionId === 'scan-repo') { setActiveView('repos'); return }
    setActiveView(actionId as View)
  }

  // ── Status helpers ────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === 'up') return <Badge variant="success">UP</Badge>
    if (status === 'degraded') return <Badge variant="warning">DEGRADED</Badge>
    return <Badge variant="danger">DOWN</Badge>
  }

  const scanStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge variant="success">COMPLETED</Badge>
    if (status === 'failed') return <Badge variant="danger">FAILED</Badge>
    return <Badge variant="info">RUNNING</Badge>
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="console-app">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`console-side ${sidebarOpen ? 'open' : ''}`}>
        <button className="console-brand" onClick={onBack}>
          <span className="brand-mark">
            <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
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
              onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}
            >
              <Icon d={item.icon} size={18} />
              <span className="nav-label">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="console-side-foot">
          <b><span className={`status-dot ${wsConnected ? '' : 'disconnected'}`} />{wsConnected ? 'Live mode' : 'Offline'}</b>
          {wsConnected ? 'Connected to real-time API. Data persists in SQLite.' : 'Reconnecting...'}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="console-main">
        {/* Topbar */}
        <div className="console-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Icon d={ICONS.menu} size={18} />
            </button>
            <label className="console-search" style={{ cursor: 'text' }} onClick={() => setCommandOpen(true)}>
              <Icon d={ICONS.search} size={16} />
              <input
                type="text"
                placeholder="Search or press ⌘K..."
                readOnly
              />
            </label>
          </div>
          <div className="console-top-right">
            <ThemeToggle />
            <NotificationCenter onToast={(message, type) => setToast({ message, type })} />
            <div className="console-avatar" title={user?.name ?? 'User'}>
              {user?.name?.charAt(0).toUpperCase() ?? 'M'}{user?.name?.split(' ')[1]?.charAt(0).toUpperCase() ?? 'K'}
            </div>
          </div>
        </div>

        {/* ── 1. OVERVIEW ─────────────────────────────────────── */}
        {activeView === 'overview' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Overview</h1>
                <p>Real projects, scans and monitoring at a glance.</p>
              </div>
              <div className="view-actions">
                <Button variant="ghost" size="sm" icon={ICONS.refresh} onClick={fetchData} loading={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            {error && (
              <Card style={{ marginBottom: 20, borderColor: 'var(--danger)' }}>
                <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
              </Card>
            )}

            {/* KPI Grid */}
            <div className="grid grid-kpi">
              <StatCard
                label="Targets"
                value={totalTargets}
                delta={targets.length > 0 ? 'Monitored endpoints' : 'No targets yet'}
                icon={ICONS.globe}
              />
              <StatCard
                label="Scans completed"
                value={completedScans}
                bar={scans.length > 0 ? (completedScans / scans.length) * 100 : 0}
                icon={ICONS.activity}
              />
              <StatCard
                label="Scans failed"
                value={failedScans}
                delta={scans.length > 0 ? `${Math.round((failedScans / scans.length) * 100)}% failure rate` : 'No scans yet'}
                deltaType="down"
                icon={ICONS.alert}
              />
              <StatCard
                label="Active monitors"
                value={activeMonitorCount}
                delta={monitors.length > 0 ? `${monitors.length} total` : 'None configured'}
                icon={ICONS.clock}
              />
              <StatCard
                label="Avg scan score"
                value={avgScore > 0 ? avgScore : '—'}
                bar={avgScore}
                icon={ICONS.zap}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-2" style={{ marginBottom: 20 }}>
              <Card className="anim-fade-in-up stagger-1">
                <div className="card-header">
                  <h3><Icon d={ICONS.activity} size={16} /> Scan Activity</h3>
                  <span className="dim-text">Last 7 days</span>
                </div>
                <BarChart
                  data={[
                    { label: 'Mon', value: scans.filter(s => new Date(s.created_at).getDay() === 1).length },
                    { label: 'Tue', value: scans.filter(s => new Date(s.created_at).getDay() === 2).length },
                    { label: 'Wed', value: scans.filter(s => new Date(s.created_at).getDay() === 3).length },
                    { label: 'Thu', value: scans.filter(s => new Date(s.created_at).getDay() === 4).length },
                    { label: 'Fri', value: scans.filter(s => new Date(s.created_at).getDay() === 5).length },
                    { label: 'Sat', value: scans.filter(s => new Date(s.created_at).getDay() === 6).length },
                    { label: 'Sun', value: scans.filter(s => new Date(s.created_at).getDay() === 0).length },
                  ]}
                  height={140}
                />
              </Card>

              <Card className="anim-fade-in-up stagger-2">
                <div className="card-header">
                  <h3><Icon d={ICONS.shield} size={16} /> Issue Breakdown</h3>
                  <span className="dim-text">{realFindings.length} total</span>
                </div>
                {realFindings.length > 0 ? (
                  <DonutChart
                    data={[
                      { label: 'Critical', value: realFindings.filter(f => f.severity === 'critical').length, color: 'var(--sev-critical)' },
                      { label: 'High', value: realFindings.filter(f => f.severity === 'high').length, color: 'var(--sev-high)' },
                      { label: 'Medium', value: realFindings.filter(f => f.severity === 'medium').length, color: 'var(--sev-medium)' },
                      { label: 'Low', value: realFindings.filter(f => f.severity === 'low').length, color: 'var(--sev-low)' },
                    ]}
                  />
                ) : (
                  <EmptyState
                    icon={ICONS.shield}
                    title="No issues found"
                    description="Scan repositories to detect security and quality issues."
                  />
                )}
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-2">
              <Card className="anim-fade-in-up stagger-3">
                <div className="card-header">
                  <h3><Icon d={ICONS.clock} size={16} /> Recent scans</h3>
                  <span className="dim-text">{scans.length} total</span>
                </div>
                {scans.length === 0 ? (
                  <EmptyState
                    icon={ICONS.activity}
                    title="No scans yet"
                    description="Add a website to get started."
                  />
                ) : (
                  <div className="activity-list">
                    {scans.slice(0, 6).map((scan, i) => {
                      let health: ScanResultData['health']
                      let ssl: ScanResultData['ssl']
                      try {
                        const parsed = JSON.parse(scan.result ?? '{}') as ScanResultData
                        health = parsed.health
                        ssl = parsed.ssl
                      } catch { /* ignore */ }
                      return (
                        <div key={scan.id} className="activity-item" style={{ animationDelay: `${i * 50}ms` }}>
                          <span className="activity-icon" style={{
                            background: scan.status === 'completed' ? 'var(--success-bg)' : scan.status === 'failed' ? 'var(--danger-bg)' : 'var(--warning-bg)'
                          }}>
                            <StatusDot
                              status={scan.status === 'completed' ? 'up' : scan.status === 'failed' ? 'down' : 'degraded'}
                              size={10}
                            />
                          </span>
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
              </Card>

              <Card className="anim-fade-in-up stagger-4">
                <div className="card-header">
                  <h3><Icon d={ICONS.eye} size={16} /> Active monitors</h3>
                  <span className="dim-text">{monitors.length} configured</span>
                </div>
                {monitors.length === 0 ? (
                  <EmptyState
                    icon={ICONS.eye}
                    title="No monitors yet"
                    description="Set up monitoring for your endpoints."
                  />
                ) : (
                  <div className="activity-list">
                    {monitors.slice(0, 6).map((m, i) => (
                      <div key={m.id} className="activity-item" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="activity-icon" style={{
                          background: m.is_active ? 'var(--success-bg)' : 'var(--bg-elevated)'
                        }}>
                          <StatusDot status={m.is_active ? 'up' : 'unknown'} size={10} />
                        </span>
                        <span className="activity-text">{m.name} ({m.url})</span>
                        <span className="activity-time">{m.interval_sec}s interval</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {/* ── 2. WEBSITE MONITORING ───────────────────────────── */}
        {activeView === 'websites' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Website monitoring</h1>
                <p>Track uptime, latency and SSL for your websites.</p>
              </div>
            </div>

            <Card style={{ marginBottom: 20 }} className="anim-fade-in-up stagger-1">
              <div className="card-header">
                <h3><Icon d={ICONS.plus} size={16} /> Add website</h3>
              </div>
              <form onSubmit={handleAddWebsite} className="repo-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Site name (optional)"
                    className="form-input"
                    style={{ maxWidth: 220 }}
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
                  <Button type="submit" loading={scanningSite} icon={ICONS.zap}>
                    {scanningSite ? 'Scanning...' : 'Add & scan'}
                  </Button>
                </div>
                <p className="note-text">Adds the URL as a target and starts a real scan (HTTP, SSL, DNS, performance).</p>
              </form>
            </Card>

            {targets.length === 0 ? (
              <Card className="anim-fade-in-up stagger-2">
                <EmptyState
                  icon={ICONS.globe}
                  title="No websites yet"
                  description="Add one above to start monitoring."
                />
              </Card>
            ) : (
              <div className="grid grid-3">
                {targets.map((t, i) => {
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
                    <Card key={t.id} className="site-card anim-fade-in-up" glow style={{ animationDelay: `${i * 60}ms` }}>
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
                          <span className="metric-val" style={{ color: sslValid ? 'var(--success)' : 'var(--danger)' }}>
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
                    </Card>
                  )
                })}
              </div>
            )}

            {scans.length > 0 && (
              <Card style={{ marginTop: 20 }} className="anim-fade-in-up">
                <div className="card-header">
                  <h3><Icon d={ICONS.list} size={16} /> Scan results</h3>
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
                            <td>
                              <span style={{
                                color: scan.overall_score && scan.overall_score >= 80 ? 'var(--success)' : scan.overall_score && scan.overall_score >= 60 ? 'var(--warning)' : 'var(--danger)',
                                fontWeight: 600
                              }}>{scan.overall_score ?? '—'}</span>
                            </td>
                            <td>{d?.ssl?.valid != null ? (d.ssl.valid ? '✅' : '❌') : '—'}</td>
                            <td>{d?.health?.responseTimeMs != null ? `${d.health.responseTimeMs}ms` : '—'}</td>
                            <td>{new Date(scan.created_at).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {/* ── 3. REPOSITORY SCANNER ───────────────────────────── */}
        {activeView === 'repos' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Repository scanner</h1>
                <p>Paste a GitHub URL to analyze code quality, security gaps, error handling and tests.</p>
              </div>
            </div>

            <Card style={{ marginBottom: 20 }} className="anim-fade-in-up stagger-1">
              <div className="card-header">
                <h3><Icon d={ICONS.repos} size={16} /> Scan a repository</h3>
              </div>
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
                  <Button type="submit" loading={scanningRepo} icon={ICONS.zap}>
                    {scanningRepo ? 'Scanning...' : 'Start scan'}
                  </Button>
                </div>
                <p className="note-text">Public repositories only. Private repo support requires GitHub token (coming soon).</p>
              </form>
            </Card>

            {repoResult && (
              <>
                {/* ── Scan Summary ─────────────────────────────── */}
                <Card style={{ marginBottom: 20 }} className="anim-fade-in-up stagger-2" glow>
                  <div className="card-header">
                    <h3>{repoResult.owner}/{repoResult.repo}</h3>
                    <span className="dim-text">branch: {repoResult.branch ?? 'main'}</span>
                  </div>

                  {/* Score */}
                  {repoResult.score != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                      <HealthRing score={repoResult.score} size={100} strokeWidth={10} />
                      <div style={{ flex: 1 }}>
                        <div className="kpi-label">Repository Score</div>
                        <div className="kpi-val" style={{ fontSize: 36 }}>{repoResult.score}<small>/100</small></div>
                        <div style={{ marginTop: 8 }}>
                          <Progress value={repoResult.score} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Severity summary */}
                  {repoResult.summary && typeof repoResult.summary === 'object' && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                      <SevBadge severity="critical" />
                      <SevBadge severity="high" />
                      <SevBadge severity="medium" />
                      <SevBadge severity="low" />
                      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
                        Critical: {repoResult.summary.critical} · High: {repoResult.summary.high} · Medium: {repoResult.summary.medium} · Low: {repoResult.summary.low}
                      </span>
                    </div>
                  )}

                  {/* ── Repository Scan Summary ─────────────────── */}
                  {repoResult.files && repoResult.scan && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Scan Summary
                      </h4>
                      <div className="detail-grid" style={{ gap: 16 }}>
                        <div>
                          <span className="detail-label">Total Files</span>
                          <strong>{repoResult.files.total}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Files Analyzed</span>
                          <strong style={{ color: 'var(--success)' }}>{repoResult.files.analyzed}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Files Skipped</span>
                          <strong style={{ color: repoResult.files.skipped > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {repoResult.files.skipped}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">Coverage</span>
                          <strong>{repoResult.scan.coverage}%</strong>
                        </div>
                        <div>
                          <span className="detail-label">Duration</span>
                          <strong>{(repoResult.scan.durationMs / 1000).toFixed(1)}s</strong>
                        </div>
                        <div>
                          <span className="detail-label">Scanned At</span>
                          <strong>{repoResult.scannedAt ? new Date(repoResult.scannedAt).toLocaleString() : '—'}</strong>
                        </div>
                      </div>

                      {/* Skipped reasons breakdown */}
                      {repoResult.files.skipped > 0 && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Skipped: </span>
                          {repoResult.files.skippedReasons.empty > 0 && <span>empty: {repoResult.files.skippedReasons.empty} </span>}
                          {repoResult.files.skippedReasons.tooLarge > 0 && <span>too large: {repoResult.files.skippedReasons.tooLarge} </span>}
                          {repoResult.files.skippedReasons.overLimit > 0 && (
                            <span style={{ color: 'var(--warning)' }}>
                              over {repoResult.scan.maxFilesLimit}-file limit: {repoResult.files.skippedReasons.overLimit}
                              {repoResult.scan.limitReached && ' (limit reached)'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Languages */}
                      {Object.keys(repoResult.files.byLanguage).length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <span className="detail-label" style={{ display: 'block', marginBottom: 6 }}>Languages Detected</span>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {Object.entries(repoResult.files.byLanguage)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 10)
                              .map(([lang, count]) => (
                                <span key={lang} style={{
                                  padding: '4px 10px',
                                  background: 'var(--bg-elevated)',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: 'var(--text-muted)',
                                }}>
                                  {lang}: {count}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Scan Checks ─────────────────────────────── */}
                  {repoResult.checks && repoResult.checks.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Scan Checks
                      </h4>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th>Status</th><th>Check</th><th>Severity</th><th>Files Scanned</th><th>Matches</th></tr>
                          </thead>
                          <tbody>
                            {repoResult.checks.map((check) => (
                              <tr key={check.name}>
                                <td>
                                  {check.status === 'passed' && <Badge variant="success">PASSED</Badge>}
                                  {check.status === 'failed' && <Badge variant="danger">FAILED</Badge>}
                                  {check.status === 'skipped' && <Badge variant="warning">SKIPPED</Badge>}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>{check.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{check.description}</div>
                                </td>
                                <td><SevBadge severity={check.severity} /></td>
                                <td>{check.filesScanned}</td>
                                <td style={{ color: check.matchesFound > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                  {check.matchesFound}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Findings ────────────────────────────────── */}
                  {repoResult.findings && repoResult.findings.length > 0 ? (
                    <div>
                      <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Findings ({repoResult.findings.length})
                      </h4>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th>Severity</th><th>Finding</th><th>File</th><th>Line</th><th>Category</th></tr>
                          </thead>
                          <tbody>
                            {repoResult.findings.map((f, i) => (
                              <tr key={f.id ?? i} className="clickable" onClick={() => setSelectedIssue(f)}>
                                <td><SevBadge severity={f.severity} /></td>
                                <td>{f.title}</td>
                                <td className="mono-text">{f.file ?? '—'}</td>
                                <td>{f.line ?? '—'}</td>
                                <td>{f.category ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* ── Zero Findings ─────────────────────────── */
                    <div>
                      <EmptyState
                        icon={ICONS.check}
                        title="No findings detected"
                        description="No issues matched the scan patterns in the analyzed files."
                      />
                      {repoResult.files && repoResult.files.analyzed > 0 && (
                        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                          <p style={{ margin: '0 0 6px' }}><strong>{repoResult.files.analyzed} files</strong> were analyzed across {Object.keys(repoResult.files.byLanguage).length} languages.</p>
                          <p style={{ margin: '0 0 6px' }}>{repoResult.checks?.filter(c => c.status === 'passed').length ?? 0} checks passed, {repoResult.checks?.filter(c => c.status === 'skipped').length ?? 0} checks skipped.</p>
                          {repoResult.files.skipped > 0 && (
                            <p style={{ margin: '0 0 6px', color: 'var(--warning)' }}>{repoResult.files.skipped} files were skipped (see summary above).</p>
                          )}
                          <p style={{ margin: 0, fontStyle: 'italic' }}>Zero findings does not guarantee the repository is completely secure. Review skipped files and consider additional security audits.</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* ── Finding Detail ─────────────────────────── */}
                {selectedIssue && (
                  <Card className="anim-fade-in-up stagger-3">
                    <div className="card-header">
                      <h3>{selectedIssue.title}</h3>
                      <SevBadge severity={selectedIssue.severity} />
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
                      {selectedIssue.evidence && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <h4>Evidence</h4>
                          <code style={{
                            display: 'block',
                            padding: '10px 14px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 6,
                            fontSize: 12,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}>
                            {selectedIssue.evidence}
                          </code>
                        </div>
                      )}
                      <div>
                        <h4>Impact</h4>
                        <p>{selectedIssue.impact ?? '—'}</p>
                      </div>
                      <div>
                        <h4>Recommendation</h4>
                        <p>{selectedIssue.recommendation ?? '—'}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </section>
        )}

        {/* ── 4. ISSUES & FINDINGS ────────────────────────────── */}
        {activeView === 'issues' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Issues &amp; findings</h1>
                <p>Real findings from repository scans. Filter by severity.</p>
              </div>
            </div>

            <Card className="anim-fade-in-up stagger-1">
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
                        <td><SevBadge severity={issue.severity} />{priorityBadge(issue.severity)}</td>
                        <td>{issue.title}</td>
                        <td className="mono-text">{issue.file ?? '—'}</td>
                        <td>
                          <Badge variant={issue.severity === 'critical' ? 'danger' : issue.severity === 'high' ? 'warning' : 'info'}>
                            {issue.severity}
                          </Badge>
                        </td>
                        <td>
                          {issue.verification_status ? verificationBadge(issue.verification_status) : <Button variant="ghost" size="sm">Open</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedIssue && (
              <Card className="anim-fade-in-up stagger-2" style={{ marginTop: 20 }}>
                <div className="card-header">
                  <h3>{selectedIssue.title}</h3>
                  <SevBadge severity={selectedIssue.severity} />
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
              </Card>
            )}
          </section>
        )}

        {/* ── 5. AI RELIABILITY TESTS ─────────────────────────── */}
        {activeView === 'testing' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>AI reliability tests</h1>
                <p>Chaos engineering scenarios against your API endpoints.</p>
              </div>
              <Badge variant="info">COMING SOON</Badge>
            </div>

            <Card className="anim-fade-in-up stagger-1">
              <EmptyState
                icon={ICONS.testing}
                title="Chaos engineering tests coming soon"
                description="This section will be enabled once the reliability testing API is available."
              />
            </Card>
          </section>
        )}

        {/* ── 6. REPORTS & HISTORY ────────────────────────────── */}
        {activeView === 'reports' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Reports &amp; history</h1>
                <p>Generated reports and past scan results.</p>
              </div>
            </div>

            <div className="grid grid-2">
              <Card className="anim-fade-in-up stagger-1">
                <div className="card-header">
                  <h3><Icon d={ICONS.reports} size={16} /> Reports</h3>
                </div>
                <div className="list">
                  {reports.length === 0 ? (
                    <EmptyState
                      icon={ICONS.reports}
                      title="No reports yet"
                      description="Generate reports from your scan data."
                    />
                  ) : (
                    reports.map((r, i) => (
                      <div key={r.id} className="list-item" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="list-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                          <Icon d={ICONS.reports} size={16} />
                        </span>
                        <div className="list-text">
                          <div className="list-title">{r.name}</div>
                          <div className="list-sub">{r.period}</div>
                        </div>
                        <Badge variant="info">{r.format}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="anim-fade-in-up stagger-2">
                <div className="card-header">
                  <h3><Icon d={ICONS.clock} size={16} /> Scan history</h3>
                </div>
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
                                color: s.overall_score && s.overall_score >= 80 ? 'var(--success)' : s.overall_score && s.overall_score >= 60 ? 'var(--warning)' : 'var(--danger)',
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
              </Card>
            </div>
          </section>
        )}

        {/* ── 7. COMPARE ─────────────────────────────────────── */}
        {activeView === 'compare' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Scan Comparison</h1>
                <p>Compare two scans side-by-side to track improvements or regressions.</p>
              </div>
            </div>
            <ScanComparison scans={scans} />
          </section>
        )}

        {/* ── 8. SETTINGS ─────────────────────────────────────── */}
        {activeView === 'settings' && (
          <section>
            <div className="view-header anim-fade-in-up">
              <div>
                <h1>Integrations &amp; settings</h1>
                <p>Configure your Failora dashboard.</p>
              </div>
            </div>

            <div className="grid grid-2">
              <Card className="anim-fade-in-up stagger-1">
                <div className="card-header">
                  <h3><Icon d={ICONS.bell} size={16} /> Notifications</h3>
                </div>
                <Switch
                  checked={settings.emailAlerts}
                  onChange={v => setSettings(s => ({ ...s, emailAlerts: v }))}
                  label="Email alerts"
                  description="Get notified when sites go down"
                />
                <Switch
                  checked={settings.slackIntegration}
                  onChange={v => setSettings(s => ({ ...s, slackIntegration: v }))}
                  label="Slack integration"
                  description="Post alerts to Slack channel"
                />
                <Switch
                  checked={settings.webhookUrl}
                  onChange={v => setSettings(s => ({ ...s, webhookUrl: v }))}
                  label="Webhook URL"
                  description="Send events to custom endpoint"
                />
                <Switch
                  checked={settings.dailyDigest}
                  onChange={v => setSettings(s => ({ ...s, dailyDigest: v }))}
                  label="Daily digest"
                  description="Receive summary every morning"
                />
              </Card>

              <Card className="anim-fade-in-up stagger-2">
                <div className="card-header">
                  <h3><Icon d={ICONS.users} size={16} /> Account</h3>
                </div>
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
                  <Button variant="secondary" size="sm" icon={ICONS.edit}>Edit profile</Button>
                  <Button variant="ghost" size="sm" onClick={onBack}>Sign out</Button>
                </div>
              </Card>
            </div>
          </section>
        )}
      </main>

      {/* ── Command Palette ─────────────────────────────────────── */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onSelect={handleCommandSelect}
        actions={commandActions}
      />

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
