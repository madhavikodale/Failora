import ThemeToggle from './ThemeToggle'

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="logo">
          <img src="/logo.svg" alt="Failora" className="logo-img" />
          <span className="logo-text">Failora</span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it Works</a>
          <ThemeToggle />
          <button className="btn btn-ghost" onClick={(e) => { e.preventDefault(); onGetStarted() }}>Login</button>
          <button className="btn btn-primary" onClick={(e) => { e.preventDefault(); onGetStarted() }}>Get Started</button>
        </div>
      </nav>

      {/* Hero — fullscreen like Superconscious */}
      <section className="hero">
        <div className="hero-video-mask" />
        <div className="hero-glow" />
        <div className="hero-content">
          <h1 className="hero-title" data-split="from-right-blur">
            <span className="line">Find. Fix.</span>
            <span className="line gradient-text">Stay Reliable.</span>
          </h1>
          <p className="hero-tag" data-split="from-down-blur">
            The Reliability Platform
          </p>
          <div className="hero-cta" view-item="from-center">
            <p className="hero-cta-text">Never go down unexpectedly</p>
            <button className="main-button" onClick={(e) => { e.preventDefault(); onGetStarted() }}>
              <span className="button-text">Start Free Trial</span>
              <div className="button-hover-bg" />
            </button>
          </div>
        </div>
        <div className="hero-mobile-point" view-item="from-center">
          <div className="hero-mobile">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dot red" />
                <div className="preview-dot yellow" />
                <div className="preview-dot green" />
                <span className="preview-title">failora-dashboard</span>
              </div>
              <div className="preview-body">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-value text-success">99.9%</span>
                    <span className="stat-label">Uptime</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-value text-warning">72</span>
                    <span className="stat-label">Score</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-value text-danger">3</span>
                    <span className="stat-label">Alerts</span>
                  </div>
                </div>
                <div className="preview-chart">
                  <div className="chart-bar" style={{ height: '60%' }} />
                  <div className="chart-bar" style={{ height: '80%' }} />
                  <div className="chart-bar" style={{ height: '45%' }} />
                  <div className="chart-bar" style={{ height: '90%' }} />
                  <div className="chart-bar" style={{ height: '70%' }} />
                  <div className="chart-bar" style={{ height: '95%' }} />
                  <div className="chart-bar" style={{ height: '55%' }} />
                  <div className="chart-bar" style={{ height: '85%' }} />
                </div>
                <div className="preview-alert">
                  <span className="status-dot success" />
                  <span>All systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-down-mask" />
      </section>

      {/* Logo/Stats strip */}
      <section className="logo-sc">
        <div className="container">
          <div className="hero-stats" view-item="from-center">
            <div className="hero-stat">
              <strong>99.9%</strong>
              <span>Uptime SLA</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <strong>10K+</strong>
              <span>Websites Scanned</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <strong>&lt;2s</strong>
              <span>Alert Latency</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <strong>50+</strong>
              <span>Check Types</span>
            </div>
          </div>
        </div>
      </section>

      {/* About / Manifesto — like Superconscious "Control Your Mind" */}
      <section className="about-sc">
        <div className="about-pin">
          <div className="container">
            <h2 className="about-headline">
              <span className="about-line">
                <span className="about-word">Scan.</span>
                <span className="about-icon">🔍</span>
                <span className="about-word">Test.</span>
              </span>
              <span className="about-line">
                <span className="about-word">Monitor.</span>
                <span className="about-icon">💓</span>
                <span className="about-word gradient-text">Recover.</span>
              </span>
            </h2>
          </div>
        </div>
        <div className="about-pg">
          <div className="container">
            <p className="about-pg-text">
              <span className="about-space">E</span>verything you need for reliability is already within your infrastructure — Failora helps you access it. Our advanced AI personalizes your monitoring journey, detects failures before they happen, and keeps you aligned with your highest uptime. Reliability has never been this clear, this powerful, or this effortless.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works — sticky cards like Superconscious */}
      <section id="how-it-works" className="how-work-sc">
        <div className="container">
          <div className="how-work-sticky">
            <h2 className="how-work-headline">
              Upgrade<span className="your-space">Your</span> <span className="hw-italic gradient-text">Reliability</span>
            </h2>
          </div>
          <div className="how-work-widgets">
            <div className="hw-card" view-item="from-center">
              <div className="hw-card-inner">
                <div className="hw-icon">📡</div>
                <h3>Input Your Current Stack & Desired SLA</h3>
                <p>Reflect on where you are and where your reliability needs to be.</p>
              </div>
            </div>
            <div className="hw-card" view-item="from-center">
              <div className="hw-card-inner">
                <div className="hw-icon">🧠</div>
                <h3>Failora AI Analyzes Patterns & Failure Modes</h3>
                <p>Receive tailored scans, failure tests, and reliability insights.</p>
              </div>
            </div>
            <div className="hw-card" view-item="from-center">
              <div className="hw-card-inner">
                <div className="hw-icon">⚡</div>
                <h3>AI Creates Your Personalized Reliability Journey</h3>
                <p>Experience a personalized path to uptime, clarity, and resilience.</p>
              </div>
            </div>
            <div className="hw-card" view-item="from-center">
              <div className="hw-card-inner">
                <div className="hw-icon">🚀</div>
                <h3>Adapt and Grow with Failora</h3>
                <p>Transform your infrastructure and achieve zero downtime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — alternating like Superconscious "what-is" */}
      <section id="features" className="what-is-sc">
        <div className="container">
          <div className="what-is-list">
            <div className="what-is-item" view-item="from-center">
              <div className="what-is-widget">🔍</div>
              <div className="what-is-text">
                <h3>URL Scanner</h3>
                <p>Comprehensive scans: SSL, DNS, security headers, performance, broken links.</p>
              </div>
            </div>
            <div className="what-is-line" />
            <div className="what-is-item reverse" view-item="from-center">
              <div className="what-is-text">
                <h3>Failure Testing</h3>
                <p>Chaos engineering for APIs. Test timeout, retry, and circuit breaker scenarios.</p>
              </div>
              <div className="what-is-widget">💥</div>
            </div>
            <div className="what-is-line" />
            <div className="what-is-item" view-item="from-center">
              <div className="what-is-widget">💓</div>
              <div className="what-is-text">
                <h3>Heartbeat Monitoring</h3>
                <p>Continuous uptime monitoring with instant alerts when things go wrong.</p>
              </div>
            </div>
            <div className="what-is-line" />
            <div className="what-is-item reverse" view-item="from-center">
              <div className="what-is-text">
                <h3>GitHub Scanner</h3>
                <p>Security vulnerability detection, code quality analysis, and best practices.</p>
              </div>
              <div className="what-is-widget">🔐</div>
            </div>
          </div>
        </div>
      </section>

      {/* For whom — stacked cards like Superconscious */}
      <section className="stack-sc">
        <div className="stack-height">
          <div className="stack-sticky">
            <div className="container">
              <div className="stack-card-wrapper">
                <div className="stack-card" view-item="from-center">
                  <div className="stack-text">
                    <div className="stack-tag">For Startups</div>
                    <h2>Launch with Confidence</h2>
                    <p>Failora helps you break through reliability barriers, detect failures early, and unlock your highest potential. No matter what you're building, Failora is your personalized guide to uptime.</p>
                  </div>
                  <div className="stack-circle" />
                  <div className="stack-image">🚀</div>
                </div>
              </div>
              <div className="stack-card-wrapper">
                <div className="stack-card s2" view-item="from-center">
                  <div className="stack-text">
                    <div className="stack-tag">For Enterprise</div>
                    <h2>Empower Your Team to Achieve More</h2>
                    <p>Failora for Enterprise helps you unlock the full potential of your infrastructure by transforming monitoring, eliminating blind spots, and creating a culture of peak reliability.</p>
                  </div>
                  <div className="stack-circle" />
                  <div className="stack-image">🏢</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — like Superconscious "Your Dream Life Starts Here" */}
      <section className="cta-sc">
        <div className="container">
          <div className="cta-card" view-item="from-center">
            <div className="cta-text">
              <h2>Your Reliable<br />Infrastructure Starts Here</h2>
              <p>Download Failora and begin your journey to zero downtime today.</p>
              <button className="main-button" onClick={(e) => { e.preventDefault(); onGetStarted() }}>
                <span className="button-text">Get Started Free</span>
                <div className="button-hover-bg" />
              </button>
            </div>
            <div className="cta-image" view-item="from-down">
              <div className="cta-mockup">⚡</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-logo">
              <img src="/logo.svg" alt="Failora" />
              <span>Failora</span>
            </div>
            <div className="footer-links">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#docs">Docs</a>
              <a href="#blog">Blog</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>Find • Fix • Stay Reliable</p>
            <p className="footer-copy">© 2026 Failora. Built for reliability engineers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
