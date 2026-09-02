// src/services/devices.service.ts
import { devicesRepository } from '@/repositories/devices.repository'
import type { MobileDevice, MobileDeviceView, MobileBrand, MobileModel, DeviceStatus } from '@/types/database'

export interface DeviceFormData {
  imei1: string
  imei2: string
  serial_number: string
  brand_id: string
  model_id: string
  storage: string
  color: string
  condition: string
  supplier_id: string
  purchase_date: string
  cost_price: number
  selling_price: number
  warranty_months: number
  location: string
  notes: string
  added_by: string
}

export interface DeviceStats {
  total: number
  inStock: number
  sold: number
  defective: number
  repair: number
  returned: number
  totalCostValue: number
  totalSellingValue: number
}

export interface ImeiLookupResult {
  found: boolean
  device: MobileDeviceView | null
}

const VALID_CONDITIONS = ['new', 'used', 'refurbished'] as const
type Condition = typeof VALID_CONDITIONS[number]

export const devicesService = {

  // ── Queries ───────────────────────────────────────────────────────────────

  getAll: (): Promise<MobileDeviceView[]> =>
    devicesRepository.getAll(),

  getById: (id: string): Promise<MobileDeviceView | null> =>
    devicesRepository.getById(id),

  getStats: async (): Promise<DeviceStats> => {
    const devices = await devicesRepository.getAll()
    return {
      total:             devices.length,
      inStock:           devices.filter(d => d.status === 'in_stock').length,
      sold:              devices.filter(d => d.status === 'sold').length,
      defective:         devices.filter(d => d.status === 'defective').length,
      repair:            devices.filter(d => d.status === 'sent_to_repair').length,
      returned:          devices.filter(d => d.status === 'returned').length,
      totalCostValue:    devices.filter(d => d.status === 'in_stock').reduce((s, d) => s + (d.cost_price ?? 0), 0),
      totalSellingValue: devices.filter(d => d.status === 'in_stock').reduce((s, d) => s + (d.selling_price ?? 0), 0),
    }
  },

  lookupByImei: async (imei: string): Promise<ImeiLookupResult> => {
    const trimmed = imei.trim()
    if (!trimmed) return { found: false, device: null }
    const results = await devicesRepository.lookupByImei(trimmed)
    return results.length > 0
      ? { found: true,  device: results[0] }
      : { found: false, device: null }
  },

  // ── Brands & Models ───────────────────────────────────────────────────────

  getAllBrands: (): Promise<MobileBrand[]> =>
    devicesRepository.getAllBrands(),

  getModelsByBrand: (brandId: string): Promise<MobileModel[]> =>
    devicesRepository.getModelsByBrand(brandId),

  createBrand: async (name: string): Promise<MobileBrand> => {
    if (!name.trim()) throw new Error('اسم الماركة مطلوب')
    return devicesRepository.createBrand(name.trim())
  },

  createModel: async (brandId: string, name: string): Promise<MobileModel> => {
    if (!brandId)    throw new Error('اختر الماركة أولاً')
    if (!name.trim()) throw new Error('اسم الموديل مطلوب')
    return devicesRepository.createModel(brandId, name.trim())
  },

  // ── Mutations ─────────────────────────────────────────────────────────────

  create: async (form: DeviceFormData): Promise<MobileDevice> => {
    if (!form.imei1?.trim())       throw new Error('IMEI 1 مطلوب')
    if (form.imei1.trim().length < 15) throw new Error('IMEI يجب أن يكون 15 رقم على الأقل')
    if (!form.model_id)            throw new Error('الموديل مطلوب')
    if (!form.supplier_id)         throw new Error('المورد مطلوب')
    if (!form.purchase_date)       throw new Error('تاريخ الشراء مطلوب')
    if (Number(form.cost_price) <= 0) throw new Error('سعر الشراء يجب أن يكون أكبر من صفر')

    const warrantyMonths = Number(form.warranty_months) || 0
    const purchaseDate   = new Date(form.purchase_date)
    const warrantyExpiry = warrantyMonths > 0
      ? new Date(purchaseDate.setMonth(purchaseDate.getMonth() + warrantyMonths)).toISOString()
      : null

    return devicesRepository.create({
      imei1:              form.imei1.trim(),
      imei2:              form.imei2?.trim()         || null,
      serial_number:      form.serial_number?.trim() || null,
      model_id:           form.model_id,
      storage:            form.storage?.trim()       || null,
      color:              form.color?.trim()         || null,
      condition:          (VALID_CONDITIONS.includes(form.condition as Condition) ? form.condition : 'new'),
      supplier_id:        form.supplier_id,
      purchase_invoice_id: null,
      purchase_date:      form.purchase_date,
      cost_price:         Number(form.cost_price),
      selling_price:      Number(form.selling_price) || null,
      actual_selling_price: null,
      sold_to_customer_id: null,
      sale_invoice_id:    null,
      sold_at:            null,
      warranty_months:    warrantyMonths,
      warranty_expires_at: warrantyExpiry,
      status:             'in_stock',
      location:           form.location?.trim()      || null,
      notes:              form.notes?.trim()         || null,
      added_by:           form.added_by,
      sold_by:            null,
    })
  },

  updateStatus: async (id: string, status: DeviceStatus, extra?: Partial<MobileDevice>): Promise<MobileDevice> => {
    return devicesRepository.update(id, { status, ...extra })
  },

  update: async (id: string, form: Partial<DeviceFormData>): Promise<MobileDevice> => {
    const payload: Partial<Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>> = {}

    if (form.imei1 !== undefined) {
      if (!form.imei1.trim()) throw new Error('IMEI 1 مطلوب')
      payload.imei1 = form.imei1.trim()
    }
    if (form.imei2         !== undefined) payload.imei2         = form.imei2?.trim()         || null
    if (form.serial_number !== undefined) payload.serial_number = form.serial_number?.trim() || null
    if (form.model_id      !== undefined) payload.model_id      = form.model_id
    if (form.storage       !== undefined) payload.storage       = form.storage?.trim()       || null
    if (form.color         !== undefined) payload.color         = form.color?.trim()         || null
    if (form.condition     !== undefined) payload.condition     = form.condition
    if (form.supplier_id   !== undefined) payload.supplier_id   = form.supplier_id
    if (form.purchase_date !== undefined) payload.purchase_date = form.purchase_date
    if (form.cost_price    !== undefined) payload.cost_price    = Number(form.cost_price)
    if (form.selling_price !== undefined) payload.selling_price = Number(form.selling_price) || null
    if (form.warranty_months !== undefined) payload.warranty_months = Number(form.warranty_months) || 0
    if (form.location      !== undefined) payload.location      = form.location?.trim()      || null
    if (form.notes         !== undefined) payload.notes         = form.notes?.trim()         || null

    return devicesRepository.update(id, payload)
  },

  // ── Soft Delete — يختفي من الواجهة ويبقى في التاريخ ─────────────────────
  remove: (id: string): Promise<void> =>
    devicesRepository.softDelete(id),
}
