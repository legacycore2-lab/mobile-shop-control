import { cn } from '@/lib/cn'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface Props {
  variant?: Variant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variants: Record<Variant, string> = {
  success: 'bg-green-50  text-green-700  border-green-200',
  danger:  'bg-red-50    text-red-700    border-red-200',
  warning: 'bg-amber-50  text-amber-700  border-amber-200',
  info:    'bg-blue-50   text-blue-700   border-blue-200',
  neutral: 'bg-gray-100  text-gray-600   border-gray-200',
}

const dots: Record<Variant, string> = {
  success: 'bg-green-500',
  danger:  'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
  neutral: 'bg-gray-400',
}

export function Badge({ variant = 'neutral', children, className, dot }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant],
      className,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[variant])} />}
      {children}
    </span>
  )
}
