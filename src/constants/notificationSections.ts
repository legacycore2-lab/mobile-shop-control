// src/constants/notificationSections.ts
import type { NotificationSection } from '@/types/notifications'

export const NOTIFICATION_SECTION_ORDER: NotificationSection[] = ['today', 'yesterday', 'earlier', 'stock']

export const NOTIFICATION_SECTION_LABELS: Record<NotificationSection, string> = {
  today:     'اليوم',
  yesterday: 'أمس',
  earlier:   'أقدم',
  stock:     'المخزون',
}
