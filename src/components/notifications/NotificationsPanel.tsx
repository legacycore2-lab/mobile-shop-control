// src/components/notifications/NotificationsPanel.tsx
import { useMemo, useState } from 'react'
import { CheckCheck, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NotificationItem } from './NotificationItem'
import { NOTIFICATION_SECTION_LABELS, NOTIFICATION_SECTION_ORDER } from '@/constants/notificationSections'
import type { AppNotification, NotificationTab } from '@/types/notifications'

interface Props {
  items:       AppNotification[]
  unreadCount: number
  showTabs:    boolean
  onSelect:    (item: AppNotification) => void
  onMarkAll:   () => void
  soundEnabled:  boolean
  onToggleSound: () => void
}

const TAB_LABELS: Record<NotificationTab, string> = {
  all:    'الكل',
  orders: 'الطلبات',
  stock:  'المخزون',
}

function isStock(item: AppNotification): boolean {
  return item.section === 'stock'
}

export function NotificationsPanel({ items, unreadCount, showTabs, onSelect, onMarkAll, soundEnabled, onToggleSound }: Props) {
  const [tab, setTab] = useState<NotificationTab>('all')

  const counts: Record<NotificationTab, number> = useMemo(() => ({
    all:    items.length,
    orders: items.filter(i => !isStock(i)).length,
    stock:  items.filter(isStock).length,
  }), [items])

  const visible = useMemo(() => items.filter(i =>
    tab === 'all' ? true : tab === 'stock' ? isStock(i) : !isStock(i),
  ), [items, tab])

  const sections = NOTIFICATION_SECTION_ORDER
    .map(section => ({ section, rows: visible.filter(i => i.section === section) }))
    .filter(s => s.rows.length > 0)

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-bold text-gray-900 dark:text-white">الإشعارات</span>
          {unreadCount > 0 && (
            <span className="text-[11.5px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-2.5 py-0.5">
              {unreadCount} جديد
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'كتم نغمة الإشعارات' : 'تشغيل نغمة الإشعارات'}
            title={soundEnabled ? 'كتم النغمة' : 'تشغيل النغمة'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        <button
          type="button"
          onClick={onMarkAll}
          disabled={unreadCount === 0}
          aria-label="تحديد الكل كمقروء"
          title="تحديد الكل كمقروء"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <CheckCheck size={18} />
        </button>
        </div>
      </div>

      {showTabs && (
        <div className="flex items-center gap-1.5 px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          {(Object.keys(TAB_LABELS) as NotificationTab[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors',
                tab === key
                  ? 'bg-gray-900 text-white font-semibold dark:bg-white dark:text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium',
              )}
            >
              {TAB_LABELS[key]} <span className="tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
      )}

      {sections.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">لا توجد إشعارات</div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          {sections.map(({ section, rows }, index) => (
            <div key={section} className={cn(index > 0 && 'border-t border-gray-100 dark:border-gray-800')}>
              <div className="px-5 pt-3.5 pb-1.5 text-[11.5px] font-semibold text-gray-400">
                {NOTIFICATION_SECTION_LABELS[section]}
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(item => (
                  <li key={item.id}>
                    <NotificationItem item={item} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
