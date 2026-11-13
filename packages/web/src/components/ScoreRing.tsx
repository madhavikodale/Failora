import { useEffect, useState, useRef } from 'react'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  previousScore?: number | null
  showTrend?: boolean
  sparklineData?: number[]
  label?: string
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'score-excellent'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-fair'
  return 'score-poor'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  const isUp = diff > 0
  const isSame = diff === 0
  const color = isUp ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)'

  return (
    <span className="score-trend" style={{ color }}>
      {isSame ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14" />
        </svg>
      ) : isUp ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M7 17L17 7M17 7H8M17 7v9" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M7 7l10 10M17 17H8M17 17V8" />
        </svg>
      )}
      <span>{Math.abs(diff)}</span>
    </span>
  )
}

function Sparkline({ data, width = 60, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2
    const y = height - 3 - ((v - min) / range) * (height - 6)
    return `${x},${y}`
  }).join(' ')

  const lastValue = data[data.length - 1]
  const color = lastValue >= 70 ? 'var(--success)' : lastValue >= 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <svg width={width} height={height} className="score-sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}

export default function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  previousScore = null,
  showTrend = false,
  sparklineData,
  label,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const animationRef = useRef<number | null>(null)
  const circumference = ((size - strokeWidth) / 2) * 2 * Math.PI

  // Unique gradient ID per instance to avoid SVG id collisions
  const gradientId = `ring-gradient-${size}-${strokeWidth}`

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const from = animatedScore
    const to = score

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setAnimatedScore(current)
      setDisplayScore(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [score])

  const currentOffset = circumference - (animatedScore / 100) * circumference
  const scoreClass = getScoreClass(score)
  const scoreLabel = getScoreLabel(score)

  return (
    <div className={`score-ring-container ${scoreClass}`}>
      <div className="score-ring-wrapper">
        <svg width={size} height={size} className="score-ring-svg">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-violet)" />
            </linearGradient>
          </defs>
          <circle
            className="ring-bg"
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            strokeWidth={strokeWidth}
          />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            style={{
              transition: 'stroke-dashoffset 0.1s linear',
              stroke: `url(#${gradientId})`,
            }}
          />
        </svg>
        <div className="score-text">
          <span className="score-number">{displayScore}</span>
          <span className="score-denominator">/100</span>
        </div>
      </div>

      {showTrend && previousScore !== null && (
        <TrendArrow current={score} previous={previousScore} />
      )}

      {sparklineData && sparklineData.length >= 2 && (
        <Sparkline data={sparklineData} />
      )}

      {label && (
        <div className="score-label-badge">{label}</div>
      )}

      {!label && size >= 60 && (
        <div className="score-label-text">{scoreLabel}</div>
      )}
    </div>
  )
}
