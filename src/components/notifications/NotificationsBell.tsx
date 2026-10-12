// src/components/notifications/NotificationsBell.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useNotificationCenter } from '@/hooks/useNotificationCenter'
import { NotificationsPanel } from './NotificationsPanel'
import type { AppNotification } from '@/types/notifications'

interface Props {
  includeOrders: boolean
}

export function NotificationsBell({ includeOrders }: Props) {
  const { items, unreadCount, markRead, markAllRead } = useNotificationCenter(includeOrders)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleSelect(item: AppNotification) {
    markRead(item.id)
    setOpen(false)
    navigate(item.route)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="الإشعارات"
        aria-expanded={open}
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          unreadCount > 0
            ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20'
            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          open && 'bg-gray-100 dark:bg-gray-800',
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden',
            'fixed top-14 inset-x-3',
            'sm:absolute sm:top-full sm:inset-x-auto sm:left-0 sm:mt-2 sm:w-[26rem]',
          )}
          dir="rtl"
        >
          <NotificationsPanel
            items={items}
            unreadCount={unreadCount}
            showTabs={includeOrders}
            onSelect={handleSelect}
            onMarkAll={markAllRead}
          />
        </div>
      )}
    </div>
  )
}
