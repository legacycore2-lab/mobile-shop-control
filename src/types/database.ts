// src/types/database.ts
// ── Single source of truth for ALL entity types ───────────────────────────────

export type UserRole         = 'owner' | 'manager' | 'cashier' | 'warehouse'
export type DeviceStatus     = 'in_stock' | 'sold' | 'returned' | 'defective' | 'sent_to_repair'
export type ProductType      = 'accessory' | 'spare_part'
export type InvoiceStatus    = 'draft' | 'confirmed' | 'cancelled'
export type PaymentType      = 'purchase' | 'sale'
export type PartyType        = 'supplier' | 'customer'
export type PaymentMethod    = 'cash' | 'bank_transfer' | 'check' | 'other'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'holiday'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string; full_name: string; phone: string | null
  role: UserRole; is_active: boolean
  created_at: string; updated_at: string
}

// ── Parties ───────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string; name: string; phone: string | null; address: string | null
  notes: string | null; opening_balance: number; is_active: boolean
  created_by: string; created_at: string; updated_at: string
}

export interface Customer {
  id: string; name: string; phone: string | null; national_id: string | null
  address: string | null; notes: string | null; opening_balance: number
  is_active: boolean; created_by: string; created_at: string; updated_at: string
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string; name: string; type: ProductType; created_at: string
}

export interface Product {
  id: string; category_id: string; name: string; sku: string | null
  barcode: string | null; product_type: ProductType
  compatible_models: string[] | null; cost_price: number; selling_price: number
  stock_qty: number; reorder_level: number; unit: string
  default_supplier_id: string | null; is_active: boolean; notes: string | null
  created_by: string; created_at: string; updated_at: string
}

// ── Devices ───────────────────────────────────────────────────────────────────

export interface MobileBrand { id: string; name: string; created_at: string }

export interface MobileModel {
  id: string; brand_id: string; name: string; created_at: string
}

export interface MobileDevice {
  id: string; imei1: string; imei2: string | null; serial_number: string | null
  model_id: string; storage: string | null; color: string | null; condition: string
  supplier_id: string; purchase_invoice_id: string | null
  purchase_date: string; cost_price: number
  selling_price: number | null; actual_selling_price: number | null
  sold_to_customer_id: string | null; sale_invoice_id: string | null
  sold_at: string | null; warranty_months: number; warranty_expires_at: string | null
  status: DeviceStatus; location: string | null; notes: string | null
  added_by: string; sold_by: string | null; created_at: string; updated_at: string
}

export interface MobileDeviceView extends MobileDevice {
  brand_name: string; model_name: string; supplier_name: string
  customer_name: string | null; customer_phone: string | null
  added_by_name: string; sold_by_name: string | null
}

// ── Invoice base (shared fields between purchase & sale) ──────────────────────

interface BaseInvoice {
  id:             string
  invoice_number: string
  invoice_date:   string
  total_amount:   number
  paid_amount:    number
  discount:       number
  remaining:      number
  notes:          string | null
  status:         InvoiceStatus
  created_by:     string
  created_at:     string
  updated_at:     string
}

// ── Purchase Invoices ─────────────────────────────────────────────────────────

export interface PurchaseInvoice extends BaseInvoice {
  supplier_id: string
}

export interface PurchaseInvoiceView extends PurchaseInvoice {
  supplier_name:   string
  created_by_name: string
  devices_count:   number
  products_count:  number
}

export interface PurchaseInvoiceDevice {
  id: string; invoice_id: string; device_id: string; cost_price: number; created_at: string
}

export interface PurchaseInvoiceProduct {
  id: string; invoice_id: string; product_id: string
  quantity: number; unit_price: number; subtotal: number; created_at: string
}

export interface PurchaseInvoiceDetailDevice extends PurchaseInvoiceDevice {
  brand_name: string; model_name: string
  imei1: string; imei2: string | null
  storage: string | null; color: string | null; condition: string
  selling_price: number; warranty_months: number
  status: string
  sale_invoice_id: string | null
}

export interface PurchaseInvoiceDetailProduct extends PurchaseInvoiceProduct {
  product_name: string; unit: string
  sku: string | null; barcode: string | null
  selling_price: number; category_name: string
}

export interface PurchaseInvoiceDetail {
  invoice:  PurchaseInvoiceView
  devices:  PurchaseInvoiceDetailDevice[]
  products: PurchaseInvoiceDetailProduct[]
}

// ── Sale Invoices ─────────────────────────────────────────────────────────────

export interface SaleInvoice extends BaseInvoice {
  customer_id: string | null
}

export interface SaleInvoiceView extends SaleInvoice {
  customer_name:   string | null
  customer_phone:  string | null
  created_by_name: string
  devices_count:   number
  products_count:  number
}

export interface SaleInvoiceDevice {
  id: string; invoice_id: string; device_id: string
  actual_selling_price: number; created_at: string
}

export interface SaleInvoiceProduct {
  id: string; invoice_id: string; product_id: string
  quantity: number; unit_price: number; subtotal: number; created_at: string
}

export interface SaleInvoiceDetailDevice extends SaleInvoiceDevice {
  brand_name: string; model_name: string; imei1: string; cost_price: number
}

export interface SaleInvoiceDetailProduct extends SaleInvoiceProduct {
  product_name: string; unit: string; cost_price: number
}

export interface SaleInvoiceDetail {
  invoice:  SaleInvoiceView
  devices:  SaleInvoiceDetailDevice[]
  products: SaleInvoiceDetailProduct[]
}

// ── Payments & Ledger ─────────────────────────────────────────────────────────

export interface Payment {
  id: string; payment_type: PaymentType; invoice_id: string; invoice_number: string
  party_type: PartyType; party_id: string; amount: number
  payment_method: PaymentMethod; payment_date: string
  notes: string | null; created_by: string | null; created_at: string
}

export interface SupplierLedger {
  supplier_id: string; supplier_name: string; supplier_phone: string | null
  opening_balance: number; total_invoiced: number; total_paid: number; balance: number
}

export interface CustomerLedger {
  customer_id: string; customer_name: string; customer_phone: string | null
  opening_balance: number; total_invoiced: number; total_paid: number; balance: number
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string; user_id: string; action: string; entity_type: string
  entity_id: string | null; description: string | null
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null
  ip_address: string | null; created_at: string
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string; name: string; created_at: string
}

export interface Expense {
  id: string; category_id: string | null; amount: number
  description: string | null; expense_date: string; payment_method: string
  reference_number: string | null; notes: string | null
  created_by: string | null; created_at: string; updated_at: string
}

export interface ExpenseView extends Expense {
  category_name: string; created_by_name: string
}

// ── Attendance ────────────────────────────────────────────────────────────────

export interface Employee {
  id:               string
  name:             string
  phone:            string | null
  national_id:      string | null
  job_title:        string | null
  base_salary:      number
  work_start_time:  string   // "HH:MM:SS"
  work_end_time:    string
  late_grace_min:   number
  late_deduct_pct:  number
  absent_deduct:    number
  is_active:        boolean
  notes:            string | null
  created_at:       string
  updated_at:       string
}

export interface AttendanceSettings {
  id:               string
  shop_latitude:    number
  shop_longitude:   number
  allowed_radius_m: number
  updated_at:       string
}

export interface AttendanceRecord {
  id:               string
  employee_id:      string
  record_date:      string
  check_in_at:      string | null
  check_out_at:     string | null
  check_in_lat:     number | null
  check_in_lng:     number | null
  check_out_lat:    number | null
  check_out_lng:    number | null
  check_in_dist_m:  number | null
  check_out_dist_m: number | null
  is_within_range:  boolean | null
  status:           AttendanceStatus
  late_minutes:     number
  work_hours:       number | null
  overtime_hours:   number
  deduction:        number
  notes:            string | null
  created_by:       string | null
  created_at:       string
  updated_at:       string
}

export interface AttendanceRecordView extends AttendanceRecord {
  employee_name: string
  job_title:     string | null
}

export interface AttendanceMonthlySummary {
  employee_id:          string
  employee_name:        string
  base_salary:          number
  job_title:            string | null
  month:                string   // "YYYY-MM"
  total_days:           number
  present_days:         number
  late_days:            number
  absent_days:          number
  half_days:            number
  total_late_minutes:   number
  total_work_hours:     number
  total_overtime_hours: number
  total_deductions:     number
  net_salary:           number
}

export interface RecordAttendanceResult {
  success:  boolean
  type?:    string
  distance?: number
  time?:    string
  error?:   string
  allowed?: number
}

// ── Supabase DB map ───────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles:                  { Row: Profile;                Insert: Omit<Profile, 'created_at'|'updated_at'>;                          Update: Partial<Profile> }
      suppliers:                 { Row: Supplier;               Insert: Omit<Supplier, 'id'|'created_at'|'updated_at'>;                    Update: Partial<Supplier> }
      customers:                 { Row: Customer;               Insert: Omit<Customer, 'id'|'created_at'|'updated_at'>;                    Update: Partial<Customer> }
      product_categories:        { Row: ProductCategory;        Insert: Omit<ProductCategory, 'id'|'created_at'>;                          Update: Partial<ProductCategory> }
      products:                  { Row: Product;                Insert: Omit<Product, 'id'|'created_at'|'updated_at'>;                     Update: Partial<Product> }
      mobile_brands:             { Row: MobileBrand;            Insert: Omit<MobileBrand, 'id'|'created_at'>;                              Update: Partial<MobileBrand> }
      mobile_models:             { Row: MobileModel;            Insert: Omit<MobileModel, 'id'|'created_at'>;                              Update: Partial<MobileModel> }
      mobile_devices:            { Row: MobileDevice;           Insert: Omit<MobileDevice, 'id'|'created_at'|'updated_at'>;                Update: Partial<MobileDevice> }
      purchase_invoices:         { Row: PurchaseInvoice;        Insert: Omit<PurchaseInvoice, 'id'|'created_at'|'updated_at'|'remaining'>; Update: Partial<PurchaseInvoice> }
      purchase_invoice_devices:  { Row: PurchaseInvoiceDevice;  Insert: Omit<PurchaseInvoiceDevice, 'id'|'created_at'>;                    Update: never }
      purchase_invoice_products: { Row: PurchaseInvoiceProduct; Insert: Omit<PurchaseInvoiceProduct, 'id'|'created_at'|'subtotal'>;        Update: never }
      sale_invoices:             { Row: SaleInvoice;            Insert: Omit<SaleInvoice, 'id'|'created_at'|'updated_at'|'remaining'>;     Update: Partial<SaleInvoice> }
      sale_invoice_devices:      { Row: SaleInvoiceDevice;      Insert: Omit<SaleInvoiceDevice, 'id'|'created_at'>;                        Update: never }
      sale_invoice_products:     { Row: SaleInvoiceProduct;     Insert: Omit<SaleInvoiceProduct, 'id'|'created_at'|'subtotal'>;            Update: never }
      payments:                  { Row: Payment;                Insert: Omit<Payment, 'id'|'created_at'>;                                  Update: never }
      audit_logs:                { Row: AuditLog;               Insert: Omit<AuditLog, 'id'|'created_at'>;                                 Update: never }
      employees:                 { Row: Employee;               Insert: Omit<Employee, 'id'|'created_at'|'updated_at'>;                    Update: Partial<Employee> }
      attendance_records:        { Row: AttendanceRecord;       Insert: Omit<AttendanceRecord, 'id'|'created_at'|'updated_at'>;            Update: Partial<AttendanceRecord> }
      attendance_settings:       { Row: AttendanceSettings;     Insert: Omit<AttendanceSettings, 'id'|'updated_at'>;                       Update: Partial<AttendanceSettings> }
    }
    Functions: {
      lookup_device_by_imei:        { Args: { p_imei: string };      Returns: MobileDeviceView[] }
      get_low_stock_products:       { Args: Record<never, never>;     Returns: { product_id: string; product_name: string; stock_qty: number; reorder_level: number; category_name: string }[] }
      next_purchase_invoice_number: { Args: Record<never, never>;     Returns: string }
      next_sale_invoice_number:     { Args: Record<never, never>;     Returns: string }
      record_attendance:            { Args: { p_employee_id: string; p_lat: number; p_lng: number; p_type: string }; Returns: RecordAttendanceResult }
      haversine_distance:           { Args: { lat1: number; lng1: number; lat2: number; lng2: number }; Returns: number }
    }
  }
}
