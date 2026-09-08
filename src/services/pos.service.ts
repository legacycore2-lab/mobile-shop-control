// src/services/pos.service.ts
// ── Business Logic — orchestrates repository calls ────────────────────────────
import {
  posRepository,
  type SaleDeviceLine,
  type SaleProductLine,
  type SaleInvoiceDetail,
} from '@/repositories/pos.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import type { MobileDeviceView, SaleInvoice, SaleInvoiceView } from '@/types/database'

export type { SaleDeviceLine, SaleProductLine, SaleInvoiceDetail, SaleInvoiceView }

export interface SaleFormData {
  customer_id:   string
  invoice_date:  string
  paid_amount:   number
  discount:      number
  notes:         string
  created_by:    string
  device_lines:  SaleDeviceLine[]
  product_lines: SaleProductLine[]
}

export interface PosStats {
  total: number; draft: number; confirmed: number; cancelled: number
  totalRevenue: number; totalPaid: number; totalDue: number
  totalCostSold: number
}

export const posService = {

  getAll: (): Promise<SaleInvoiceView[]> => posRepository.getAll(),

  getById: (id: string): Promise<SaleInvoiceDetail | null> => posRepository.getById(id),

  getStats: (): Promise<PosStats> => posRepository.getStats(),

  getInStockDevices: (): Promise<MobileDeviceView[]> => posRepository.getInStockDevices(),

  // ── Create draft invoice ──────────────────────────────────────────────────

  create: async (form: SaleFormData): Promise<SaleInvoice> => {
    if (!form.device_lines.length && !form.product_lines.length)
      throw new Error('يجب إضافة جهاز أو منتج واحد على الأقل')

    const invoiceNumber = await posRepository.nextInvoiceNumber()
    const deviceTotal   = form.device_lines .reduce((s, l) => s + l.actual_selling_price,   0)
    const productTotal  = form.product_lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const totalAmount   = Math.max(0, deviceTotal + productTotal - (form.discount ?? 0))

    const invoice = await posRepository.create({
      invoice_number: invoiceNumber,
      customer_id:    form.customer_id || null,
      invoice_date:   form.invoice_date,
      total_amount:   totalAmount,
      paid_amount:    Number(form.paid_amount) || 0,
      discount:       Number(form.discount)    || 0,
      notes:          form.notes?.trim()       || null,
      status:         'draft',
      created_by:     form.created_by,
    })

    await Promise.all([
      posRepository.addDeviceLines(invoice.id, form.device_lines),
      posRepository.addProductLines(invoice.id, form.product_lines),
    ])

    return invoice
  },

  // ── Confirm invoice — mark devices sold + deduct product stock ────────────

  confirm: async (id: string, customerId: string | null, soldById: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail)                             throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status !== 'draft')   throw new Error('يمكن تأكيد المسودات فقط')

    const deviceLines  = await posRepository.getDeviceLinesByInvoice(id)
    const productLines = await posRepository.getProductLinesByInvoice(id)

    const priceMap = new Map(deviceLines.map(l => [l.device_id, l.actual_selling_price]))
    const deviceIds = deviceLines.map(l => l.device_id)

    await Promise.all([
      posRepository.updateStatus(id, 'confirmed'),
      posRepository.markDevicesSold(deviceIds, id, customerId, soldById, priceMap),
      posRepository.adjustProductStock(productLines.map(l => ({ product_id: l.product_id, qty_delta: -l.quantity }))),
    ])
  },

  // ── Cancel — restore devices + product stock ──────────────────────────────

  cancel: async (id: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail)                                throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'cancelled')  throw new Error('الفاتورة ملغاة بالفعل')

    const isConfirmed = detail.invoice.status === 'confirmed'

    if (isConfirmed) {
      const deviceLines  = await posRepository.getDeviceLinesByInvoice(id)
      const productLines = await posRepository.getProductLinesByInvoice(id)

      await Promise.all([
        posRepository.markDevicesInStock(deviceLines.map(l => l.device_id)),
        posRepository.adjustProductStock(productLines.map(l => ({ product_id: l.product_id, qty_delta: l.quantity }))),
      ])
    }

    await posRepository.updateStatus(id, 'cancelled')
  },

  // ── Delete draft only ─────────────────────────────────────────────────────

  remove: async (id: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail)                                    throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed')      throw new Error('لا يمكن حذف فاتورة مؤكدة')
    await posRepository.remove(id)
  },

  // ── Record initial payment (called from hook after create if paid_amount > 0) ─

  recordInitialPayment: async (
    invoiceId: string,
    invoiceNumber: string,
    customerId: string | null,
    amount: number,
    date: string,
    createdBy: string,
  ): Promise<void> => {
    if (amount <= 0 || !customerId) return
    await paymentsRepository.create({
      payment_type:   'sale',
      invoice_id:     invoiceId,
      invoice_number: invoiceNumber,
      party_type:     'customer',
      party_id:       customerId,
      amount,
      payment_method: 'cash',
      payment_date:   date,
      notes:          'دفعة أولى عند إنشاء الفاتورة',
      created_by:     createdBy || null,
    })
  },
}
