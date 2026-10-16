// src/types/stockReconcile.ts
// ── مطابقة المخزون: مقارنة الأجهزة الموجودة فعلاً (اتمسحت) بسجلات النظام ───────
import type { DeviceStatus } from '@/types/database'

export interface ReconcileDevice {
  id:            string
  imei1:         string
  imei2:         string | null
  brand_name:    string
  model_name:    string
  storage:       string | null
  color:         string | null
  status:        DeviceStatus
  cost_price:    number
  selling_price: number | null
  purchase_date: string
}

export type ScanKind = 'matched' | 'other_status' | 'unknown'

export interface ScanLookup {
  kind:    ScanKind
  device?: ReconcileDevice
}

export interface ReconcileResult {
  matched:     ReconcileDevice[]   // مسجلة "في المخزون" واتمسحت
  missing:     ReconcileDevice[]   // مسجلة "في المخزون" ومتمسحتش (غالباً اتباعت من غير تسجيل)
  otherStatus: ReconcileDevice[]   // اتمسحت بس حالتها في النظام مش "في المخزون"
  unknown:     string[]            // اتمسحت ومش موجودة في النظام خالص
}
