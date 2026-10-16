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

// موديل يتحدد بالماركة + الاسم — بيتستخدم لتحديد الأنواع المشمولة بالمطابقة
export interface ScopeModel {
  key:        string
  label:      string
  brand_name: string
  model_name: string
  in_stock:   number
}

// ── العد بالموديل: نوع = ماركة + موديل + تخزين + لون ──────────────────────────
export interface ModelGroup {
  key:        string
  label:      string
  brand_name: string
  model_name: string
  storage:    string | null
  color:      string | null
  system_qty: number
}

export interface ModelCountRow extends ModelGroup {
  counted: number | null   // null = لسه معدّش
  diff:    number | null   // الفعلي − النظام (سالب = ناقص)
}
