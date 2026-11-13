import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import type { Alert } from '../api/client'
import { Icon, ICONS } from './ui'

interface NotificationCenterProps {
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'var(--sev-critical)'
    case 'high': return 'var(--sev-high)'
    case 'medium': return 'var(--sev-medium)'
    case 'low': return 'var(--sev-low)'
    default: return 'var(--text-muted)'
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case 'critical': return 'rgba(239, 68, 68, 0.12)'
    case 'high': return 'rgba(249, 115, 22, 0.12)'
    case 'medium': return 'rgba(245, 158, 11, 0.12)'
    case 'low': return 'rgba(34, 211, 238, 0.12)'
    default: return 'var(--bg-elevated)'
  }
}

export default function NotificationCenter({ onToast }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getAlerts()
      setAlerts(data)
      setUnreadCount(data.filter(a => !a.acknowledged).length)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchAlerts()
    }
  }, [open, fetchAlerts])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [open])

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeAlert(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: 1 } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
      onToast?.('Alert marked as read', 'success')
    } catch {
      onToast?.('Failed to acknowledge alert', 'error')
    }
  }

  const handleAcknowledgeAll = async () => {
    const unack = alerts.filter(a => !a.acknowledged)
    for (const alert of unack) {
      try {
        await api.acknowledgeAlert(alert.id)
      } catch {
        // continue
      }
    }
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: 1 })))
    setUnreadCount(0)
    onToast?.('All alerts marked as read', 'success')
  }

  const unacknowledged = alerts.filter(a => !a.acknowledged)
  const acknowledged = alerts.filter(a => a.acknowledged)

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        className="console-iconbtn"
        title="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Icon d={ICONS.bell} size={17} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <div className="notification-title">
              <Icon d={ICONS.bell} size={16} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-count">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="notification-clear-btn" onClick={handleAcknowledgeAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <div className="notification-spinner" />
                <span>Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="notification-empty">
                <Icon d={ICONS.shield} size={24} />
                <span>No alerts yet</span>
                <span className="notification-empty-sub">
                  Monitor alerts and scan failures will appear here.
                </span>
              </div>
            ) : (
              <>
                {unacknowledged.length > 0 && (
                  <>
                    <div className="notification-section">New</div>
                    {unacknowledged.map(alert => (
                      <div key={alert.id} className="notification-item unread">
                        <div
                          className="notification-severity"
                          style={{ background: severityBg(alert.severity), color: severityColor(alert.severity) }}
                        >
                          {alert.severity}
                        </div>
                        <div className="notification-content">
                          <div className="notification-message">{alert.message}</div>
                          <div className="notification-meta">
                            <span>{timeAgo(alert.sent_at)}</span>
                          </div>
                        </div>
                        <button
                          className="notification-ack-btn"
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Mark as read"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {acknowledged.length > 0 && (
                  <>
                    <div className="notification-section">Earlier</div>
                    {acknowledged.slice(0, 5).map(alert => (
                      <div key={alert.id} className="notification-item read">
                        <div
                          className="notification-severity"
                          style={{ background: severityBg(alert.severity), color: severityColor(alert.severity) }}
                        >
                          {alert.severity}
                        </div>
                        <div className="notification-content">
                          <div className="notification-message">{alert.message}</div>
                          <div className="notification-meta">
                            <span>{timeAgo(alert.sent_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="notification-footer">
              <span>{alerts.length} total alerts</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
