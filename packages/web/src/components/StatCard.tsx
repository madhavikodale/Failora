type StatColor = 'blue' | 'green' | 'red' | 'purple' | 'cyan' | 'orange'

interface StatCardProps {
  label: string
  value: string | number
  color: StatColor
  icon?: string
}

const colorMap: Record<StatColor, string> = {
  blue: 'stat-blue',
  green: 'stat-green',
  red: 'stat-red',
  purple: 'stat-purple',
  cyan: 'stat-cyan',
  orange: 'stat-orange',
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className={`stat-card card card-raise ${colorMap[color]}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default StatCard
