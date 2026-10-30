/* ── Reusable Component Library — Failora Advanced UI ──────────────── */

import React, { useState, useEffect, useRef } from 'react'

/* ── Icon Component ────────────────────────────────────────────────── */

interface IconProps {
  d: string
  size?: number
  className?: string
}

export const Icon: React.FC<IconProps> = ({ d, size = 18, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: size, height: size, flex: 'none' }}
  >
    <path d={d} />
  </svg>
)

export const ICONS = {
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
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  external: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  database: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5',
  server: 'M6 6h.01M6 18h.01M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zM6 10h12M6 14h12',
  cpu: 'M9 9h6v6H9zM4 4h16v16H4zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3',
  menu: 'M3 12h18M3 6h18M3 18h18',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  stop: 'M6 6h12v12H6z',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z',
  command: 'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z',
}

/* ── Button ────────────────────────────────────────────────────────── */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'violet'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = size !== 'md' ? `btn-${size}` : ''
  const loadingClass = loading ? 'btn-loading' : ''

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${loadingClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {icon && !loading && <Icon d={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

/* ── Card ──────────────────────────────────────────────────────────── */

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = true, glow = false, style }) => (
  <div
    className={`console-card ${hover ? '' : 'no-hover'} ${glow ? 'card-glow' : ''} ${className}`}
    style={style}
  >
    {children}
  </div>
)

/* ── Badge ─────────────────────────────────────────────────────────── */

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'muted', className = '' }) => (
  <span className={`badge badge-${variant} ${className}`}>{children}</span>
)

/* ── Severity Badge ────────────────────────────────────────────────── */

interface SevBadgeProps {
  severity: string
}

export const SevBadge: React.FC<SevBadgeProps> = ({ severity }) => (
  <span className={`sev-badge ${severity.toLowerCase()}`}>{severity.toUpperCase()}</span>
)

/* ── Stat Card ─────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaType?: 'up' | 'down'
  icon?: string
  bar?: number
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, delta, deltaType = 'up', icon, bar }) => (
  <div className="console-card kpi-card anim-fade-in-up">
    {icon && (
      <div className="kpi-icon">
        <Icon d={icon} size={18} />
      </div>
    )}
    <div className="kpi-label">{label}</div>
    <div className="kpi-val">{value}</div>
    {delta && (
      <div className={`kpi-delta ${deltaType === 'down' ? 'bad' : ''}`}>
        {deltaType === 'up' ? <Icon d={ICONS.arrowUp} size={12} /> : <Icon d={ICONS.arrowDown} size={12} />}
        {delta}
      </div>
    )}
    {bar !== undefined && (
      <div className="kpi-bar">
        <i style={{ width: `${bar}%` }} />
      </div>
    )}
  </div>
)

/* ── Input ─────────────────────────────────────────────────────────── */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string
  label?: string
}

export const Input: React.FC<InputProps> = ({ icon, label, className = '', ...props }) => {
  if (label) {
    return (
      <div className="form-group">
        <label className="label">{label}</label>
        <div className="input-group">
          {icon && <span className="input-group-icon"><Icon d={icon} size={16} /></span>}
          <input className={`input ${className}`} style={{ height: 'auto' }} {...props} />
        </div>
      </div>
    )
  }
  return (
    <div className="input-group">
      {icon && <span className="input-group-icon"><Icon d={icon} size={16} /></span>}
      <input className={`input ${className}`} style={{ height: 'auto' }} {...props} />
    </div>
  )
}

/* ── Avatar ────────────────────────────────────────────────────────── */

interface AvatarProps {
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Avatar: React.FC<AvatarProps> = ({ name = 'U', size = 'md' }) => {
  const initials = name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sizeClass = size !== 'md' ? `avatar-${size}` : ''

  return <div className={`avatar ${sizeClass}`}>{initials}</div>
}

/* ── Progress Bar ──────────────────────────────────────────────────── */

interface ProgressProps {
  value: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({ value, variant = 'default', className = '' }) => (
  <div className={`progress ${variant !== 'default' ? `progress-${variant}` : ''} ${className}`}>
    <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
)

/* ── Switch ────────────────────────────────────────────────────────── */

interface SwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
}

export const Switch: React.FC<SwitchProps> = ({ checked = false, onChange, label, description }) => (
  <div className="toggle-row">
    <div>
      {label && <div className="toggle-label">{label}</div>}
      {description && <div className="toggle-desc">{description}</div>}
    </div>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={e => onChange?.(e.target.checked)} />
      <span />
    </label>
  </div>
)

/* ── Skeleton ──────────────────────────────────────────────────────── */

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width, height }} />
)

/* ── Empty State ───────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
    {icon && (
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--accent-subtle)',
        display: 'grid', placeItems: 'center',
        margin: '0 auto 16px',
        color: 'var(--accent)'
      }}>
        <Icon d={icon} size={28} />
      </div>
    )}
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    {description && <p className="dim-text" style={{ maxWidth: 320, margin: '0 auto 20px' }}>{description}</p>}
    {action}
  </div>
)

/* ── Modal ─────────────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'grid', placeItems: 'center',
      zIndex: 'var(--z-modal)',
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div
        className="console-card anim-scale-in-bounce"
        style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="card-header" style={{ marginBottom: 20 }}>
            <h3>{title}</h3>
            <button className="btn-icon" onClick={onClose}>
              <Icon d={ICONS.x} size={18} />
            </button>
          </div>
        )}
        {children}
        {footer && <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

/* ── Tooltip ───────────────────────────────────────────────────────── */

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <span className="tooltip" data-tooltip={content}>
    {children}
  </span>
)

/* ── Tabs ──────────────────────────────────────────────────────────── */

interface TabsProps {
  tabs: { id: string; label: string; icon?: string; badge?: string | number }[]
  active: string
  onChange: (id: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          borderBottom: active === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: active === tab.id ? 600 : 500,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: -1
        }}
      >
        {tab.icon && <Icon d={tab.icon} size={16} />}
        {tab.label}
        {tab.badge && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: active === tab.id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
            color: active === tab.id ? 'var(--accent)' : 'var(--text-muted)'
          }}>
            {tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
)

/* ── Health Ring ───────────────────────────────────────────────────── */

interface HealthRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export const HealthRing: React.FC<HealthRingProps> = ({ score, size = 120, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (score >= 80) return 'var(--success)'
    if (score >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-sunk)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: `drop-shadow(0 0 8px ${getColor()})`
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
        fontSize: size / 4, fontWeight: 700
      }}>
        {score}
      </div>
    </div>
  )
}

/* ── Sparkline Chart ───────────────────────────────────────────────── */

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 32,
  color = 'var(--accent)'
}) => {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height
  }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity="0.1" />
    </svg>
  )
}

/* ── Bar Chart ─────────────────────────────────────────────────────── */

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 120 }) => {
  const max = Math.max(...data.map(d => d.value)) || 1

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{d.value}</span>
          <div style={{
            width: '100%',
            height: (d.value / max) * (height - 40),
            background: d.color || 'linear-gradient(180deg, var(--accent), var(--accent-violet))',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            minHeight: 4
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Donut Chart ───────────────────────────────────────────────────── */

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 140 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const radius = size / 2 - 20
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-sunk)" strokeWidth="16" />
        {data.map((d, i) => {
          const pct = d.value / total
          const dashLength = pct * circumference
          const offset = currentOffset
          currentOffset += dashLength
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          )
        })}
      </svg>
      <div style={{ display: 'grid', gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Heatmap ───────────────────────────────────────────────────────── */

interface HeatmapProps {
  data: number[][] // 7x24 grid
}

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const max = Math.max(...data.flat()) || 1
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {data.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span style={{ width: 32, fontSize: 11, color: 'var(--text-muted)' }}>{days[i]}</span>
          {row.map((v, j) => (
            <div
              key={j}
              style={{
                width: 14, height: 14, borderRadius: 3,
                background: `rgba(34, 211, 238, ${v / max})`,
                transition: 'background 0.3s'
              }}
              title={`${days[i]} ${j}:00 — ${v} events`}
            />
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 3, marginLeft: 32, marginTop: 4 }}>
        {[0, 6, 12, 18, 23].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', width: 14 * 6, textAlign: 'center' }}>
            {h}:00
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Command Palette ───────────────────────────────────────────────── */

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSelect: (action: string) => void
  actions: { id: string; label: string; icon: string; shortcut?: string; group?: string }[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSelect, actions }) => {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) { onSelect(filtered[selected].id); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (!open) return null

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.id.toLowerCase().includes(query.toLowerCase())
  )

  const groups = [...new Set(filtered.map(a => a.group || 'Actions'))]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'grid', placeItems: 'start center',
      paddingTop: '15vh',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div
        className="console-card anim-fade-in-up"
        style={{ width: '100%', maxWidth: 560, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon d={ICONS.search} size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0) }}
              placeholder="Type a command or search..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 15
              }}
            />
            <kbd style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              border: '1px solid var(--border)'
            }}>ESC</kbd>
          </div>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{
                padding: '8px 20px', fontSize: 11, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                {group}
              </div>
              {filtered.filter(a => (a.group || 'Actions') === group).map((action) => {
                const idx = filtered.indexOf(action)
                return (
                  <button
                    key={action.id}
                    onClick={() => { onSelect(action.id); onClose() }}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 20px',
                      background: selected === idx ? 'var(--bg-hover)' : 'none',
                      border: 'none', color: 'var(--text)',
                      fontSize: 14, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <Icon d={action.icon} size={16} />
                    <span style={{ flex: 1 }}>{action.label}</span>
                    {action.shortcut && (
                      <kbd style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                        border: '1px solid var(--border)'
                      }}>
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Notification Toast ────────────────────────────────────────────── */

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'var(--success)',
    error: 'var(--danger)',
    info: 'var(--info)',
    warning: 'var(--warning)'
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      padding: '14px 20px',
      background: 'var(--bg-elevated)',
      border: `1px solid ${colors[type]}`,
      borderRadius: 'var(--r-md)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 16px ${colors[type]}20`,
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: 9999
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[type] }} />
      <span style={{ fontSize: 14 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 8 }}>
        <Icon d={ICONS.x} size={14} />
      </button>
    </div>
  )
}

/* ── Status Dot ────────────────────────────────────────────────────── */

interface StatusDotProps {
  status: 'up' | 'down' | 'degraded' | 'unknown'
  size?: number
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 8 }) => {
  const colors: Record<string, string> = {
    up: 'var(--success)',
    down: 'var(--danger)',
    degraded: 'var(--warning)',
    unknown: 'var(--text-muted)'
  }

  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[status],
      boxShadow: `0 0 ${size}px ${colors[status]}`,
      display: 'inline-block'
    }} />
  )
}
