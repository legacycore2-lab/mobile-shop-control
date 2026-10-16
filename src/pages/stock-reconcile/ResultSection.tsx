// src/pages/stock-reconcile/ResultSection.tsx
import { Card } from '@/components/ui/Card'

interface Props {
  title:       string
  description: string
  count:       number
  actions?:    React.ReactNode
  children:    React.ReactNode
}

export function ResultSection({ title, description, count, actions, children }: Props) {
  return (
    <Card padding={false}>
      <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {title} <span className="text-gray-400 font-normal">({count})</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </Card>
  )
}
