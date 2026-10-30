import { useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'
import ThemeToggle from './ThemeToggle'

interface AuthPageProps {
  onAuth: (token: string, user: { id: string; email: string; name: string }) => void
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Try login first
      let result = await api.login({ email, password })

      // If login fails, try auto-register (demo mode)
      if (!result.success && isLogin) {
        result = await api.register({ email, name: name || email.split('@')[0], password })
      }

      if (result.success && result.token && result.user) {
        success(isLogin ? 'Welcome back!' : 'Account created!')
        onAuth(result.token, result.user)
      } else {
        const msg = result.error ?? 'Authentication failed'
        setError(msg)
        toastError(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* Left branding panel */}
        <div className="auth-branding">
          <div className="auth-branding-inner">
            <div className="auth-logo">
              <span className="logo-icon">⚡</span>
              <h1>Failora</h1>
            </div>
            <p className="auth-tagline">Website Health & Reliability Platform</p>

            <div className="auth-features">
              <div className="auth-feature">
                <span className="feature-icon">🔍</span>
                <div>
                  <strong>Deep Scanning</strong>
                  <span>SSL, DNS, headers, performance, broken links</span>
                </div>
              </div>
              <div className="auth-feature">
                <span className="feature-icon">📊</span>
                <div>
                  <strong>Real-time Monitoring</strong>
                  <span>Uptime tracking with instant alerts</span>
                </div>
              </div>
              <div className="auth-feature">
                <span className="feature-icon">🛡️</span>
                <div>
                  <strong>Security Analysis</strong>
                  <span>Vulnerability detection & recommendations</span>
                </div>
              </div>
            </div>

            <div className="auth-stats">
              <div className="auth-stat">
                <strong>99.9%</strong>
                <span>Uptime</span>
              </div>
              <div className="auth-stat">
                <strong>10K+</strong>
                <span>Scans</span>
              </div>
              <div className="auth-stat">
                <strong>&lt;2s</strong>
                <span>Alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div className="auth-theme-toggle">
            <ThemeToggle />
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={isLogin ? 'active' : ''}
                onClick={() => { setIsLogin(true); setError(null) }}
              >
                Sign In
              </button>
              <button
                className={!isLogin ? 'active' : ''}
                onClick={() => { setIsLogin(false); setError(null) }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label className="label" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? 'Enter your password' : 'Min 8 characters'}
                  required
                  minLength={isLogin ? undefined : 8}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Please wait…</>
                ) : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-demo">
              <p>Demo: Use any email & password (min 8 chars for signup)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
