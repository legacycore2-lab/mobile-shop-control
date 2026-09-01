import { cn } from '@/lib/cn'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface Props {
  variant?: Variant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variants: Record<Variant, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  danger:  'bg-red-50   dark:bg-red-900/20   text-red-700   dark:text-red-400   border-red-200   dark:border-red-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  info:    'bg-blue-50  dark:bg-blue-900/20  text-blue-700  dark:text-blue-400  border-blue-200  dark:border-blue-800',
  neutral: 'bg-gray-100 dark:bg-gray-800     text-gray-600  dark:text-gray-400  border-gray-200  dark:border-gray-700',
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
