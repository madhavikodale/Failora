interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'badge-success' },
  pending: { label: 'Pending', className: 'badge-warning' },
  running: { label: 'Running', className: 'badge-info' },
  failed: { label: 'Failed', className: 'badge-danger' },
  error: { label: 'Error', className: 'badge-danger' },
  active: { label: 'Active', className: 'badge-success' },
  inactive: { label: 'Inactive', className: 'badge-muted' },
  up: { label: 'Up', className: 'badge-success' },
  down: { label: 'Down', className: 'badge-danger' },
  healthy: { label: 'Healthy', className: 'badge-success' },
  unhealthy: { label: 'Unhealthy', className: 'badge-danger' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'badge-muted' }

  return (
    <span className={`badge ${config.className}`}>
      <span className={`status-dot ${config.className.replace('badge-', '')}`} />
      {config.label}
    </span>
  )
}
