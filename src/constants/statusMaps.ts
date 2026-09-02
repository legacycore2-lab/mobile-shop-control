// src/constants/statusMaps.ts
// ── Single source of truth for all status labels & badge variants ─────────────

import type { DeviceStatus, InvoiceStatus } from '@/types/database'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import type { ElementType } from 'react'

// ── Badge variant type ────────────────────────────────────────────────────────

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

// ── Device status ─────────────────────────────────────────────────────────────

export const DEVICE_STATUS_MAP: Record<DeviceStatus, {
  label:   string
  variant: BadgeVariant
}> = {
  in_stock:       { label: 'في المخزون',  variant: 'success' },
  sold:           { label: 'مباع',        variant: 'info'    },
  returned:       { label: 'مُعاد',       variant: 'warning' },
  defective:      { label: 'تالف',        variant: 'danger'  },
  sent_to_repair: { label: 'في الصيانة', variant: 'warning' },
}

// ── Device condition ──────────────────────────────────────────────────────────

export const CONDITION_MAP: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

// ── Invoice status (Purchases + POS) ─────────────────────────────────────────

export const INVOICE_STATUS_MAP: Record<InvoiceStatus, {
  label:   string
  variant: BadgeVariant
  icon:    ElementType
}> = {
  draft:     { label: 'مسودة', variant: 'neutral', icon: Clock        },
  confirmed: { label: 'مؤكدة', variant: 'success', icon: CheckCircle  },
  cancelled: { label: 'ملغاة', variant: 'danger',  icon: XCircle      },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format number in Arabic locale */
export function fmt(n: number): string {
  return n.toLocaleString('ar-EG')
}

/** Format number as currency with ج.م suffix */
export function fmtEGP(n: number): string {
  return `${n.toLocaleString('ar-EG')} ج.م`
}
