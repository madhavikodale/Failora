import { useState, useEffect, useCallback } from 'react'
import { api } from './api/client'
import type { Target, Run, ScanResult, Monitor } from './api/client'
import { ThemeProvider } from './contexts/ThemeContext'
import { useToast } from './hooks/useToast'
import ToastContainer from './components/ToastContainer'
import ThemeToggle from './components/ThemeToggle'
import StatCard from './components/StatCard'
import TargetList from './components/TargetList'
import AddTargetForm from './components/AddTargetForm'
import RunTestForm from './components/RunTestForm'
import RunList from './components/RunList'
import RunDetails from './components/RunDetails'
import AuthPage from './components/AuthPage'
import LandingPage from './components/LandingPage'
import ScanPanel from './components/ScanPanel'
import ScanList from './components/ScanList'
import ScanDetails from './components/ScanDetails'
import MonitorPanel from './components/MonitorPanel'
import GitHubScannerPanel from './components/GitHubScannerPanel'
import APITesterPanel from './components/APITesterPanel'
import BrokenLinksPanel from './components/BrokenLinksPanel'
import ConsolePage from './components/ConsolePage'
import './App.css'

type Tab = 'overview' | 'scans' | 'monitors' | 'api-tester' | 'github' | 'links'
type View = 'landing' | 'auth' | 'dashboard' | 'console'

function AppContent() {
  const [view, setView] = useState<View>('console')
  const [token, setToken] = useState<string | null>(localStorage.getItem('failora_token'))
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [targets, setTargets] = useState<Target[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [scans, setScans] = useState<ScanResult[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const { toasts, success, error: toastError } = useToast()

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

  const fetchTargets = useCallback(async () => {
    try { setTargets(await api.listTargets()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load targets') }
  }, [])

  const fetchRuns = useCallback(async () => {
    try { setRuns(await api.listRuns()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load runs') }
  }, [])

  const fetchScans = useCallback(async () => {
    try { setScans(await api.listScans()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load scans') }
  }, [])

  const fetchMonitors = useCallback(async () => {
    try { setMonitors(await api.listMonitors()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load monitors') }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const healthy = await checkHealth()
    if (healthy) {
      await Promise.all([fetchTargets(), fetchRuns(), fetchScans(), fetchMonitors()])
    }
    setLoading(false)
  }, [checkHealth, fetchTargets, fetchRuns, fetchScans, fetchMonitors])

  useEffect(() => {
    if (view === 'dashboard') {
      refresh()
      const interval = setInterval(refresh, 10000)
      return () => clearInterval(interval)
    }
  }, [view, refresh])

  // Check URL params for auto-login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    const urlUser = params.get('user')
    const urlView = params.get('view')
    if (urlToken && urlUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(urlUser))
        localStorage.setItem('failora_token', urlToken)
        localStorage.setItem('failora_user', JSON.stringify(parsedUser))
        setToken(urlToken)
        setUser(parsedUser)
        setView(urlView === 'console' ? 'console' : 'dashboard')
        // Clean URL
        window.history.replaceState({}, '', '/')
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then((u) => { setUser(u); setView('dashboard') })
        .catch(() => {
          localStorage.removeItem('failora_token')
          setToken(null)
          setView('landing')
        })
    }
  }, [token])

  useEffect(() => {
    if (view !== 'dashboard') return
    const pendingRuns = runs.filter(r => r.status === 'pending')
    if (pendingRuns.length === 0) return
    const pollInterval = setInterval(async () => {
      for (const run of pendingRuns) {
        try {
          const updated = await api.getRun(run.id)
          setRuns(prev => prev.map(r => r.id === run.id ? updated : r))
          if (updated.status !== 'pending' && selectedRun?.id === run.id) setSelectedRun(updated)
        } catch { /* silent */ }
      }
    }, 1000)
    return () => clearInterval(pollInterval)
  }, [runs, selectedRun, view])

  const handleAuth = (newToken: string, newUser: { id: string; email: string; name: string }) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('failora_token', newToken)
    setView('dashboard')
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('failora_token')
    setView('landing')
  }

  const handleAddTarget = async (data: { name: string; url: string; method: string }) => {
    await api.createTarget(data)
    await fetchTargets()
    success(`Target "${data.name}" added`)
  }

  const handleRunTest = async (data: { target_id: string; mode: string; timeout_ms?: number; max_retries?: number }) => {
    const run = await api.createRun(data)
    setRuns(prev => [run, ...prev])
    success('Test started')
    return run
  }

  const handleScanCreated = (scan: ScanResult) => {
    setScans(prev => [scan, ...prev])
    success('Scan started')
  }

  const handleMonitorCreated = (monitor: Monitor) => {
    setMonitors(prev => [monitor, ...prev])
  }

  const handleToggleMonitor = async (id: string, active: boolean) => {
    try {
      await api.toggleMonitor(id, active)
      setMonitors(prev => prev.map(m => m.id === id ? { ...m, is_active: active } : m))
      success(active ? 'Monitor resumed' : 'Monitor paused')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle monitor'
      setError(msg)
      toastError(msg)
    }
  }

  const totalRuns = runs.length
  const passedRuns = runs.filter(r => r.status === 'completed').length
  const failedRuns = runs.filter(r => r.status === 'failed').length
  const recoveryRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0
  const activeMonitors = monitors.filter(m => m.is_active).length

  // ── Landing Page ──────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <>
        <LandingPage onGetStarted={() => window.location.href = '/failora-site.html'} />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  // ── Auth Page ─────────────────────────────────────────────────────
  if (view === 'auth') {
    return (
      <>
        <AuthPage onAuth={handleAuth} />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  // ── Console Page ──────────────────────────────────────────────────
  if (view === 'console') {
    return (
      <>
        <ConsolePage onBack={() => setView('landing')} user={user} />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  // ── Dashboard — Sidebar Layout ─────────────────────────────────────
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="Failora" className="sidebar-logo-img" />
          <span>Failora</span>
        </div>

        <nav className="sidebar-nav">
          {([
            ['overview', '📊', 'Overview'],
            ['scans', '🔍', 'Scans'],
            ['monitors', '💓', 'Monitors'],
            ['api-tester', '🚀', 'API Tester'],
            ['github', '🔐', 'GitHub'],
            ['links', '🔗', 'Links'],
          ] as const).map(([tab, icon, label]) => (
            <button
              key={tab}
              className={`sidebar-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as Tab)}
            >
              <span className="sidebar-nav-icon">{icon}</span>
              <span className="sidebar-nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-console-btn"
            onClick={() => setView('console')}
          >
            <span>💬</span>
            <span>Open Console</span>
          </button>
          <div className={`api-status ${apiConnected === null ? 'unknown' : apiConnected ? 'connected' : 'disconnected'}`}>
            <span className="badge-dot" style={{ background: apiConnected ? 'var(--success)' : 'var(--danger)' }} />
            <span>{apiConnected === null ? 'Checking' : apiConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar glass">
          <div className="topbar-left">
            <h2 className="topbar-title">
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'scans' && 'Scans'}
              {activeTab === 'monitors' && 'Monitors'}
              {activeTab === 'api-tester' && 'API Tester'}
              {activeTab === 'github' && 'GitHub Scanner'}
              {activeTab === 'links' && 'Broken Links'}
            </h2>
          </div>
          <div className="topbar-right">
            {user && (
              <div className="user-menu">
                <div className="user-avatar">
                  {user.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </header>

        <main className="app-main">
          {error && (
            <div className="error-banner animate-fade-in">
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner spinner-lg" />
              <p>Loading dashboard…</p>
            </div>
          ) : !apiConnected ? (
            <div className="empty-state">
              <div className="empty-icon">🔌</div>
              <h2>Cannot connect to API</h2>
              <p>Make sure the Failora API server is running:</p>
              <code className="code-block">npm run start --workspace=packages/api</code>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  <section className="stats-grid">
                    <StatCard label="Total Runs" value={totalRuns} color="blue" icon="🧪" />
                    <StatCard label="Passed" value={passedRuns} color="green" icon="✓" />
                    <StatCard label="Failed" value={failedRuns} color="red" icon="✗" />
                    <StatCard label="Recovery Rate" value={`${recoveryRate}%`} color="purple" icon="📈" />
                    <StatCard label="Active Monitors" value={activeMonitors} color="cyan" icon="💓" />
                    <StatCard label="Total Scans" value={scans.length} color="orange" icon="🔍" />
                  </section>

                  <div className="content-grid">
                    <div className="left-panel">
                      <section className="panel">
                        <div className="panel-header">
                          <h2>Targets</h2>
                          <span className="badge badge-accent">{targets.length}</span>
                        </div>
                        {targets.length === 0 ? (
                          <div className="empty-mini">
                            <p>No targets configured yet.</p>
                            <p className="hint">Add a target to start testing.</p>
                          </div>
                        ) : (
                          <TargetList targets={targets} />
                        )}
                      </section>

                      <section className="panel">
                        <div className="panel-header">
                          <h2>Add Target</h2>
                        </div>
                        <AddTargetForm onSubmit={handleAddTarget} />
                      </section>

                      <section className="panel">
                        <div className="panel-header">
                          <h2>Run Failure Test</h2>
                        </div>
                        <RunTestForm targets={targets} onSubmit={handleRunTest} />
                      </section>
                    </div>

                    <div className="right-panel">
                      <section className="panel">
                        <div className="panel-header">
                          <h2>Recent Runs</h2>
                          <span className="badge badge-accent">{runs.length}</span>
                        </div>
                        {runs.length === 0 ? (
                          <div className="empty-mini">
                            <p>No runs yet.</p>
                            <p className="hint">Run a test to see results here.</p>
                          </div>
                        ) : (
                          <RunList runs={runs} onSelect={setSelectedRun} selectedId={selectedRun?.id} />
                        )}
                      </section>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'scans' && (
                <div className="tab-content">
                  <ScanPanel onScanCreated={handleScanCreated} />
                  <section className="panel">
                    <div className="panel-header">
                      <h2>Scan History</h2>
                      <span className="badge badge-accent">{scans.length}</span>
                    </div>
                    <ScanList scans={scans} onSelect={setSelectedScan} selectedId={selectedScan?.id} />
                  </section>
                </div>
              )}

              {activeTab === 'monitors' && (
                <div className="tab-content">
                  <MonitorPanel
                    monitors={monitors}
                    onMonitorCreated={handleMonitorCreated}
                    onToggle={handleToggleMonitor}
                  />
                </div>
              )}

              {activeTab === 'api-tester' && (
                <div className="tab-content">
                  <APITesterPanel />
                </div>
              )}

              {activeTab === 'github' && (
                <div className="tab-content">
                  <GitHubScannerPanel />
                </div>
              )}

              {activeTab === 'links' && (
                <div className="tab-content">
                  <BrokenLinksPanel />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedRun && (
        <RunDetails run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}

      {selectedScan && (
        <ScanDetails
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          onUpdate={(updated) => {
            setScans(prev => prev.map(s => s.id === updated.id ? updated : s))
            if (selectedScan.id === updated.id) setSelectedScan(updated)
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
