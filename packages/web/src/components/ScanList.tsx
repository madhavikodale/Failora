import type { ScanResult } from '../api/client'
import StatusBadge from './StatusBadge'
import ScoreRing from './ScoreRing'

interface ScanListProps {
  scans: ScanResult[]
  onSelect: (scan: ScanResult) => void
  selectedId?: string
}

export default function ScanList({ scans, onSelect, selectedId }: ScanListProps) {
  if (scans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No scans yet</h3>
        <p>Run your first scan to see results here.</p>
      </div>
    )
  }

  return (
    <div className="scan-list">
      {scans.map((scan) => (
        <button
          key={scan.id}
          className={`scan-item ${selectedId === scan.id ? 'selected' : ''}`}
          onClick={() => onSelect(scan)}
        >
          <div className="scan-item-main">
            <div className="scan-item-header">
              <span className="scan-url">{scan.url}</span>
              <StatusBadge status={scan.status} />
            </div>
            <div className="scan-item-meta">
              <span className="text-muted text-sm">
                {new Date(scan.created_at).toLocaleString()}
              </span>
              {scan.completed_at && (
                <span className="text-muted text-sm">
                  • {Math.round((new Date(scan.completed_at).getTime() - new Date(scan.created_at).getTime()) / 1000)}s
                </span>
              )}
            </div>
          </div>
          {scan.overall_score !== null && (
            <div className="scan-item-score">
              <ScoreRing score={scan.overall_score} size={40} strokeWidth={4} />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
