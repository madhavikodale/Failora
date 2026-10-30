import type { Run } from '../api/types'

interface RunListProps {
  runs: Run[]
  onSelect: (run: Run) => void
  selectedId?: string
}

const statusColor: Record<string, string> = {
  pending: 'status-pending',
  completed: 'status-completed',
  failed: 'status-failed',
  error: 'status-error',
}

const modeLabel: Record<string, string> = {
  timeout: 'Timeout',
  http_429: 'HTTP 429',
  http_500: 'HTTP 500',
  malformed_response: 'Malformed',
}

function RunList({ runs, onSelect, selectedId }: RunListProps) {
  const sorted = [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <ul className="run-list">
      {sorted.map(run => {
        const result = run.result ? JSON.parse(run.result) : null
        const duration = result?.attempts?.reduce((sum: number, a: { durationMs: number }) => sum + a.durationMs, 0) ?? null
        return (
          <li
            key={run.id}
            className={`run-item ${selectedId === run.id ? 'selected' : ''}`}
            onClick={() => onSelect(run)}
          >
            <div className="run-info">
              <div className="run-top">
                <span className={`status-dot ${statusColor[run.status] ?? 'status-pending'}`} />
                <span className="run-mode">{modeLabel[run.mode] ?? run.mode}</span>
                {duration !== null && <span className="run-duration">{duration}ms</span>}
              </div>
              <div className="run-bottom">
                <span className="run-time">{new Date(run.created_at).toLocaleString()}</span>
                {result && (
                  <span className={`run-outcome ${result.recovered ? 'outcome-pass' : 'outcome-fail'}`}>
                    {result.recovered ? 'Recovered' : 'Failed'}
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default RunList
