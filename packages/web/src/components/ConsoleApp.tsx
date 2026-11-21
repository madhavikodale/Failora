import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Run, Monitor } from '../api/client'

// ── SVG Icons ───────────────────────────────────────────────────────

const Icon = ({ d, size = 18, className = '' }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
)

const Icons = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  monitor: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  scan: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  rocket: 'M12 2c3 3 4 7 4 10l3 3-4 1-3 3-3-3-4-1 3-3c0-3 1-7 4-10zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
}

// ── Nav Sections ────────────────────────────────────────────────────

const navSections = [
  {
    label: 'MONITOR',
    items: [
      { id: 'overview', label: 'Overview', icon: Icons.dashboard, desc: 'Security posture at a glance' },
      { id: 'monitors', label: 'Monitors', icon: Icons.heart, desc: 'Uptime & health tracking' },
      { id: 'scans', label: 'Scans', icon: Icons.scan, desc: 'Code & repo analysis' },
    ],
  },
  {
    label: 'ANALYZE',
    items: [
      { id: 'api-tester', label: 'API Tester', icon: Icons.rocket, desc: 'Endpoint validation' },
      { id: 'github', label: 'GitHub', icon: Icons.github, desc: 'Repo security scan' },
      { id: 'links', label: 'Broken Links', icon: Icons.link, desc: 'Link integrity check' },
    ],
  },
  {
    label: 'CONFIGURE',
    items: [
      { id: 'settings', label: 'Settings', icon: Icons.settings, desc: 'Workspace preferences' },
    ],
  },
] as const

type Tab = typeof navSections[number]['items'][number]['id']

// ── Loading Skeleton ────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />
}

function StatsSkeleton() {
  return (
    <div className="hero-stats">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="stat-card skeleton-card">
          <Skeleton className="skeleton-icon" />
          <Skeleton className="skeleton-value" />
          <Skeleton className="skeleton-label" />
        </div>
      ))}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="panel">
      <div className="panel-header">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-badge" />
      </div>
      <div className="panel-body">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  )
}

// ── Console App ─────────────────────────────────────────────────────

export default function ConsoleApp() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [runs, setRuns] = useState<Run[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const checkHealth = useCallback(async () => {
    try {
      await api.health()
      setApiConnected(true)
      return true
    } catch {
      setApiConnected(false)
      return false
    }
  }, [])

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const healthy = await checkHealth()
    if (!healthy) { setLoading(false); setRefreshing(false); return }
    try {
      const [r, m] = await Promise.all([
        api.listRuns().catch(() => []),
        api.listMonitors().catch(() => []),
      ])
      setRuns(r); setMonitors(m)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [checkHealth])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // TODO: open command palette
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        fetchAll(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchAll])

  const passedRuns = runs.filter(r => r.status === 'passed').length
  const failedRuns = runs.filter(r => r.status === 'failed').length
  const recoveryRate = runs.length > 0 ? Math.round((passedRuns / runs.length) * 100) : 0
  const activeMonitors = monitors.filter(m => m.is_active).length

  const getTabTitle = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.id === activeTab) return item.label
      }
    }
    return 'Overview'
  }

  const getTabDesc = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.id === activeTab) return item.desc
      }
    }
    return ''
  }

  return (
    <div className={`console-app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Animated Background */}
      <div className="console-bg">
        <div className="console-grid" />
        <div className="console-glow console-glow-1" />
        <div className="console-glow console-glow-2" />
      </div>

      {/* Sidebar */}
      <aside className="console-side">
        <button className="console-brand" onClick={() => setActiveTab('overview')}>
          <div className="brand-mark">
            <Icon d={Icons.shield} size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Failora</span>
            <span className="brand-sub">Console v3</span>
          </div>
        </button>

        <nav className="console-nav">
          {navSections.map(section => (
            <div key={section.label} className="nav-section">
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`console-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.desc}
                >
                  <span className="nav-icon"><Icon d={item.icon} size={18} /></span>
                  <span className="nav-label">{item.label}</span>
                  {item.id === 'monitors' && activeMonitors > 0 && (
                    <span className="nav-badge">{activeMonitors}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="console-footer">
          <div className={`api-status ${apiConnected === null ? 'unknown' : apiConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            <span className="status-text">{apiConnected === null ? 'Connecting' : apiConnected ? 'Connected' : 'Offline'}</span>
            <span className="status-time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Icon d={sidebarOpen ? Icons.chevronLeft : Icons.chevronRight} size={16} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="console-main">
        {/* Topbar */}
        <header className="console-topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-root">Failora</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{getTabTitle()}</span>
            </div>
            <h1 className="topbar-title">{getTabTitle()}</h1>
            <span className="topbar-desc">{getTabDesc()}</span>
          </div>
          <div className="topbar-right">
            <div className="search-box" role="button" tabIndex={0}>
              <span className="search-icon"><Icon d={Icons.search} size={14} /></span>
              <input type="text" placeholder="Search…" readOnly tabIndex={-1} />
              <kbd>⌘K</kbd>
            </div>
            <button
              className={`btn btn-primary btn-sm ${refreshing ? 'btn-loading' : ''}`}
              onClick={() => fetchAll(true)}
              disabled={refreshing}
            >
              <Icon d={Icons.refresh} size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
            <div className="user-avatar" title="Madhavi Kodale">
              <span>M</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="console-content">
          {loading ? (
            <>
              <StatsSkeleton />
              <div className="content-grid">
                <PanelSkeleton />
                <div className="side-panels">
                  <PanelSkeleton />
                  <PanelSkeleton />
                </div>
              </div>
            </>
          ) : !apiConnected ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon d={Icons.warning} size={48} /></div>
              <h2>Cannot connect to API</h2>
              <p>Start the API server:</p>
              <code className="code-block">npm run dev --workspace=packages/api</code>
              <button className="btn btn-primary" onClick={() => fetchAll()}>
                <Icon d={Icons.refresh} size={14} /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  {/* Hero Stats */}
                  <section className="hero-stats">
                    <div className="hero-card hero-primary stagger-0">
                      <div className="hero-icon"><Icon d={Icons.shield} size={32} /></div>
                      <div className="hero-content">
                        <div className="hero-value">{recoveryRate}%</div>
                        <div className="hero-label">Recovery Rate</div>
                      </div>
                      <div className="hero-spark">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="var(--accent)" />
                              <stop offset="100%" stopColor="var(--accent-violet)" />
                            </linearGradient>
                          </defs>
                          <path d="M0,30 Q25,25 50,20 T100,10" fill="none" stroke="url(#sparkGrad)" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                    <StatCard label="Total Runs" value={runs.length} color="cyan" icon={Icons.activity} delay={1} trend="+12%" />
                    <StatCard label="Passed" value={passedRuns} color="green" icon={Icons.check} delay={2} trend="+8%" />
                    <StatCard label="Failed" value={failedRuns} color="red" icon={Icons.x} delay={3} trend="-3%" />
                    <StatCard label="Active Monitors" value={activeMonitors} color="violet" icon={Icons.heart} delay={4} trend="+2" />
                  </section>

                  {/* Content Grid */}
                  <div className="content-grid">
                    <Panel title="Recent Activity" count={runs.length} className="panel-large">
                      {runs.length === 0 ? (
                        <EmptyState
                          icon={<Icon d={Icons.activity} size={28} />}
                          text="No runs yet"
                          action={{ label: 'Start your first scan', onClick: () => setActiveTab('scans') }}
                        />
                      ) : (
                        <ActivityList runs={runs.slice(0, 10)} />
                      )}
                    </Panel>

                    <div className="side-panels">
                      <Panel title="System Health" count={monitors.length}>
                        <HealthGauge
                          score={monitors.length > 0 ? Math.round((activeMonitors / monitors.length) * 100) : 0}
                          label="Uptime"
                        />
                      </Panel>

                      <Panel title="Quick Actions">
                        <div className="quick-actions">
                          <QuickAction icon={Icons.rocket} label="New Scan" desc="Start a security scan" onClick={() => setActiveTab('scans')} />
                          <QuickAction icon={Icons.heart} label="Add Monitor" desc="Track endpoint uptime" onClick={() => setActiveTab('monitors')} />
                          <QuickAction icon={Icons.github} label="GitHub Scan" desc="Analyze repository" onClick={() => setActiveTab('github')} />
                          <QuickAction icon={Icons.trend} label="View Reports" desc="Full audit history" onClick={() => {}} />
                        </div>
                      </Panel>
                    </div>
                  </div>
                </>
              )}

              {activeTab !== 'overview' && (
                <div className="empty-state">
                  <div className="empty-icon"><Icon d={Icons.warning} size={48} /></div>
                  <h2>{getTabTitle()} — Coming Soon</h2>
                  <p>This section is under active development.</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('overview')}>
                    ← Back to Overview
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({ label, value, color, icon, delay, trend }: {
  label: string; value: number | string; color: string; icon: string; delay: number; trend?: string
}) {
  return (
    <div className={`stat-card stat-${color} stagger-${delay}`} tabIndex={0} role="stat">
      <div className="stat-icon"><Icon d={icon} size={24} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className="stat-trend">
          <span className={trend.startsWith('+') ? 'trend-up' : 'trend-down'}>{trend}</span>
        </div>
      )}
    </div>
  )
}

function Panel({ title, count, children, className }: { title: string; count: number; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        <span className="badge badge-accent">{count}</span>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="panel-empty">
      <span className="empty-icon-sm">{icon}</span>
      <p>{text}</p>
      {action && (
        <button className="btn btn-primary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

function ActivityList({ runs }: { runs: Run[] }) {
  return (
    <div className="activity-list">
      {runs.map((run, i) => (
        <div key={run.id} className="activity-item" style={{ animationDelay: `${i * 0.04}s` }} tabIndex={0}>
          <div className={`activity-indicator ${run.status === 'passed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'}`} />
          <div className="activity-content">
            <span className="activity-name">{run.target_id?.slice(0, 8) ?? 'Unknown'}</span>
            <span className="activity-meta">
              {run.status} · {new Date(run.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <span className={`badge badge-${run.status === 'passed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'}`}>
            {run.status}
          </span>
        </div>
      ))}
    </div>
  )
}

function HealthGauge({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  const color = score > 80 ? 'var(--success)' : score > 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="health-gauge">
      <svg viewBox="0 0 100 100" className="gauge-svg">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="gauge-arc"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="gauge-text">
          {score}%
        </text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  )
}

function QuickAction({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon"><Icon d={icon} size={18} /></span>
      <div className="quick-content">
        <span className="quick-label">{label}</span>
        <span className="quick-desc">{desc}</span>
      </div>
      <span className="quick-arrow"><Icon d={Icons.arrowRight} size={14} /></span>
    </button>
  )
}
