import type { Run, RunResult } from '../api/types'

interface RunDetailsProps {
  run: Run
  onClose: () => void
}

function RunDetails({ run, onClose }: RunDetailsProps) {
  const result: RunResult | null = run.result ? JSON.parse(run.result) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Run Details</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className={`status-badge ${run.status}`}>{run.status}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Scenario</span>
            <span>{run.mode}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Started</span>
            <span>{new Date(run.created_at).toLocaleString()}</span>
          </div>
          {run.completed_at && (
            <div className="detail-row">
              <span className="detail-label">Completed</span>
              <span>{new Date(run.completed_at).toLocaleString()}</span>
            </div>
          )}

          {result && (
            <>
              <div className="detail-section">
                <h3>Summary</h3>
                <p className={result.recovered ? 'text-green' : 'text-red'}>{result.summary}</p>
                <div className="detail-row">
                  <span className="detail-label">Total Attempts</span>
                  <span>{result.totalAttempts}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Initial Failure</span>
                  <span>{result.initialFailure ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Recovered</span>
                  <span className={result.recovered ? 'text-green' : 'text-red'}>{result.recovered ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Used Retry</span>
                  <span>{result.usedRetry ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Attempts</h3>
                <table className="attempts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.attempts.map(a => (
                      <tr key={a.attempt}>
                        <td>{a.attempt}</td>
                        <td>
                          {a.success ? (
                            <span className="text-green">✓ {a.statusCode}</span>
                          ) : (
                            <span className="text-red">✗ {a.statusCode ?? a.errorType}</span>
                          )}
                        </td>
                        <td>{a.durationMs}ms</td>
                        <td className="error-cell">{a.errorMessage ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {run.status === 'pending' && (
            <div className="pending-state">
              <div className="spinner small" />
              <p>Test running…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RunDetails
