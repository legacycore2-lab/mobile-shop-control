// src/components/notifications/NotificationItem.tsx
import { cn } from '@/lib/cn'
import { fmtCurrency } from '@/lib/fmt'
import { NOTIFICATION_META } from './notificationMeta'
import type { AppNotification } from '@/types/notifications'

interface Props {
  item:     AppNotification
  onSelect: (item: AppNotification) => void
}

export function NotificationItem({ item, onSelect }: Props) {
  const meta      = NOTIFICATION_META[item.kind]
  const Icon      = meta.icon
  const cancelled = item.kind === 'order_cancelled'

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        'relative w-full flex gap-3 text-right px-5 py-3.5 transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-800/60',
        item.unread && 'bg-blue-50/60 dark:bg-blue-900/10',
      )}
    >
      {item.unread && (
        <span className="absolute right-2 top-7 w-1.5 h-1.5 rounded-full bg-blue-600" aria-label="غير مقروء" />
      )}

      <span className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', meta.tile)}>
        <Icon size={20} />
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn(
            'text-[13.5px] text-gray-900 dark:text-white',
            item.unread ? 'font-semibold' : 'font-medium',
          )}>
            {item.title}
          </span>
          {item.timeLabel && (
            <span className="text-[11.5px] text-gray-400 whitespace-nowrap">{item.timeLabel}</span>
          )}
        </span>

        <span className="text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-400 truncate">
          {item.body}
        </span>

        {(item.chip || item.detail) && (
          <span className="flex items-center gap-2">
            {item.chip && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', meta.chip)}>
                {item.chip}
              </span>
            )}
            {item.detail && <span className="text-[11.5px] text-gray-400">{item.detail}</span>}
          </span>
        )}

        {item.amount !== null && (
          <span className={cn(
            'text-[12.5px] font-semibold tabular-nums',
            cancelled ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white',
          )}>
            {fmtCurrency(item.amount)}
          </span>
        )}
      </span>
    </button>
  )
}
