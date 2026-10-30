import type { Target } from '../api/types'

interface TargetListProps {
  targets: Target[]
}

function TargetList({ targets }: TargetListProps) {
  return (
    <ul className="target-list">
      {targets.map(t => (
        <li key={t.id} className="target-item">
          <div className="target-info">
            <span className="target-name">{t.name}</span>
            <span className="target-url">{t.url}</span>
          </div>
          <span className="target-method">{t.method}</span>
        </li>
      ))}
    </ul>
  )
}

export default TargetList
