// src/types/notifications.ts

export type NotificationKind = 'order_new' | 'order_cancelled' | 'stock_out' | 'stock_low'

export type NotificationSection = 'today' | 'yesterday' | 'earlier' | 'stock'

export type NotificationTab = 'all' | 'orders' | 'stock'

export interface AppNotification {
  id:        string
  kind:      NotificationKind
  section:   NotificationSection
  title:     string
  body:      string
  chip:      string | null
  detail:    string | null
  amount:    number | null
  timeLabel: string | null
  unread:    boolean
  route:     string
}
