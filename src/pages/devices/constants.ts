// src/pages/devices/constants.ts
import type { DeviceStatus } from '@/types/database'

export const STATUS_MAP: Record<DeviceStatus, {
  label:   string
  variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
}> = {
  in_stock:       { label: 'في المخزون',  variant: 'success' },
  sold:           { label: 'مباع',        variant: 'info'    },
  returned:       { label: 'مُعاد',       variant: 'warning' },
  defective:      { label: 'تالف',        variant: 'danger'  },
  sent_to_repair: { label: 'في الصيانة', variant: 'warning' },
}

export const CONDITION_MAP: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

export type FilterStatus = 'all' | DeviceStatus

export const PAGE_SIZE = 10
