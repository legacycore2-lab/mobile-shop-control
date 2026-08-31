import { cn } from '@/lib/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200',
      padding && 'p-5',
      className,
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  className?: string
}

const colors = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600'  },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600'   },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600'},
}

export function StatCard({ label, value, icon, trend, color = 'blue', className }: StatCardProps) {
  const c = colors[color]
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
            <span className={cn('w-5 h-5', c.icon)}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
