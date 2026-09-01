export type UserRole      = 'owner' | 'manager' | 'cashier' | 'warehouse'
export type DeviceStatus  = 'in_stock' | 'sold' | 'returned' | 'defective' | 'sent_to_repair'
export type ProductType   = 'accessory' | 'spare_part'
export type InvoiceStatus = 'draft' | 'confirmed' | 'cancelled'

export interface Profile {
  id: string; full_name: string; phone: string | null
  role: UserRole; is_active: boolean
  created_at: string; updated_at: string
}

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

// ── Purchase Invoices ─────────────────────────────────────────────────────────

export interface PurchaseInvoice {
  id:             string
  invoice_number: string
  supplier_id:    string
  invoice_date:   string
  total_amount:   number
  paid_amount:    number
  discount:       number
  notes:          string | null
  status:         InvoiceStatus
  created_by:     string
  created_at:     string
  updated_at:     string
}

export interface PurchaseInvoiceDevice {
  id:         string
  invoice_id: string
  device_id:  string
  cost_price: number
  created_at: string
}

export interface PurchaseInvoiceProduct {
  id:         string
  invoice_id: string
  product_id: string
  quantity:   number
  unit_price: number
  subtotal:   number
  created_at: string
}

export interface PurchaseInvoiceView extends PurchaseInvoice {
  supplier_name:   string
  created_by_name: string
  devices_count:   number
  products_count:  number
  remaining:       number  // total - paid - discount
}

export interface AuditLog {
  id: string; user_id: string; action: string; entity_type: string
  entity_id: string | null; description: string | null
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null
  ip_address: string | null; created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles:                  { Row: Profile;               Insert: Omit<Profile, 'created_at'|'updated_at'>;               Update: Partial<Profile> }
      suppliers:                 { Row: Supplier;              Insert: Omit<Supplier, 'id'|'created_at'|'updated_at'>;          Update: Partial<Supplier> }
      customers:                 { Row: Customer;              Insert: Omit<Customer, 'id'|'created_at'|'updated_at'>;          Update: Partial<Customer> }
      product_categories:        { Row: ProductCategory;       Insert: Omit<ProductCategory, 'id'|'created_at'>;                Update: Partial<ProductCategory> }
      products:                  { Row: Product;               Insert: Omit<Product, 'id'|'created_at'|'updated_at'>;           Update: Partial<Product> }
      mobile_brands:             { Row: MobileBrand;           Insert: Omit<MobileBrand, 'id'|'created_at'>;                    Update: Partial<MobileBrand> }
      mobile_models:             { Row: MobileModel;           Insert: Omit<MobileModel, 'id'|'created_at'>;                    Update: Partial<MobileModel> }
      mobile_devices:            { Row: MobileDevice;          Insert: Omit<MobileDevice, 'id'|'created_at'|'updated_at'>;      Update: Partial<MobileDevice> }
      purchase_invoices:         { Row: PurchaseInvoice;       Insert: Omit<PurchaseInvoice, 'id'|'created_at'|'updated_at'>;   Update: Partial<PurchaseInvoice> }
      purchase_invoice_devices:  { Row: PurchaseInvoiceDevice; Insert: Omit<PurchaseInvoiceDevice, 'id'|'created_at'>;          Update: never }
      purchase_invoice_products: { Row: PurchaseInvoiceProduct;Insert: Omit<PurchaseInvoiceProduct, 'id'|'created_at'|'subtotal'>; Update: never }
      audit_logs:                { Row: AuditLog;              Insert: Omit<AuditLog, 'id'|'created_at'>;                       Update: never }
    }
    Functions: {
      lookup_device_by_imei:  { Args: { p_imei: string };      Returns: MobileDeviceView[] }
      get_low_stock_products: { Args: Record<never,never>;      Returns: { product_id:string; product_name:string; stock_qty:number; reorder_level:number; category_name:string }[] }
      next_purchase_invoice_number: { Args: Record<never,never>; Returns: string }
    }
  }
}
