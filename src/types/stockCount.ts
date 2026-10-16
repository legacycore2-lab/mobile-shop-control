// src/types/stockCount.ts
// ── أنواع الجرد العشوائي اليومي ───────────────────────────────────────────────

export type StockCountItemType = 'product' | 'model'
export type StockCountStatus   = 'pending' | 'submitted'

// صنف في الجرد — بالشكل اللي بيرجع من الـ RPC (من غير ربط بالمنتج/الموديل)
export interface StockCountItem {
  id:          string
  item_type:   StockCountItemType
  item_name:   string
  system_qty:  number
  is_correct:  boolean | null
  counted_qty: number | null
}

export interface StockCountSessionRow {
  id:           string
  count_date:   string
  employee_id:  string
  access_token: string
  status:       StockCountStatus
  created_by:   string
  created_at:   string
  submitted_at: string | null
}

export interface StockCountItemRow extends StockCountItem {
  session_id: string
  product_id: string | null
  model_id:   string | null
}

// الجلسة زي ما بتظهر في الشاشة الخارجية (بالـ token)
export interface PublicStockCount {
  id:            string
  count_date:    string
  status:        StockCountStatus
  employee_name: string
  items:         StockCountItem[]
}

export interface StockCountSummary {
  total:      number
  correct:    number
  wrong:      number
  unanswered: number
}

// الجلسة في شاشة الإدارة
export interface StockCountSessionView extends StockCountSessionRow {
  employee_name:  string
  employee_phone: string | null
  items:          StockCountItem[]
  summary:        StockCountSummary
}

// رد المسئول على صنف واحد (بيتبعت للـ RPC)
export interface StockCountAnswer {
  item_id:     string
  is_correct:  boolean
  counted_qty: number | null
}

// مسودة الرد في الشاشة الخارجية قبل الإرسال
export interface AnswerDraft {
  isCorrect:  boolean | null
  countedQty: string
}

export interface CreateStockCountInput {
  employeeId:    string
  productsCount: number | null   // null = كل المنتجات
  modelsCount:   number | null   // null = كل الموبايلات
}
