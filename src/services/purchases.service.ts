// src/services/purchases.service.ts
// ── Business Logic — orchestrates repository calls ────────────────────────────
import {
  purchasesRepository,
  type InvoiceDeviceLine,
  type InvoiceProductLine,
} from '@/repositories/purchases.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import type {
  PurchaseInvoice, PurchaseInvoiceView, PurchaseInvoiceDetail,
} from '@/types/database'

export type { InvoiceDeviceLine, InvoiceProductLine, PurchaseInvoiceDetail }

export interface PurchaseFormData {
  supplier_id:   string
  invoice_date:  string
  paid_amount:   number
  discount:      number
  notes:         string
  created_by:    string
  device_lines:  InvoiceDeviceLine[]
  product_lines: InvoiceProductLine[]
}

export interface PurchaseStats {
  total: number; draft: number; confirmed: number; cancelled: number
  totalSpent: number; totalPaid: number; totalDue: number
}

export const purchasesService = {

  getAll: (): Promise<PurchaseInvoiceView[]>            => purchasesRepository.getAll(),
  getById: (id: string): Promise<PurchaseInvoiceDetail | null> => purchasesRepository.getById(id),
  getStats: (): Promise<PurchaseStats>                  => purchasesRepository.getStats(),
  nextInvoiceNumber: (): Promise<string>                => purchasesRepository.nextInvoiceNumber(),
  getUnlinkedDevicesBySupplier: (supplierId: string)    => purchasesRepository.getUnlinkedDevicesBySupplier(supplierId),

  create: async (form: PurchaseFormData): Promise<PurchaseInvoice> => {
    if (!form.supplier_id)  throw new Error('المورد مطلوب')
    if (!form.invoice_date) throw new Error('تاريخ الفاتورة مطلوب')
    if (!form.device_lines.length && !form.product_lines.length)
      throw new Error('يجب إضافة جهاز أو منتج واحد على الأقل')

    const invoiceNumber = await purchasesRepository.nextInvoiceNumber()
    const deviceTotal   = form.device_lines .reduce((s, l) => s + l.cost_price,            0)
    const productTotal  = form.product_lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const totalAmount   = Math.max(0, deviceTotal + productTotal - (form.discount ?? 0))

    const invoice = await purchasesRepository.create({
      invoice_number: invoiceNumber,
      supplier_id:    form.supplier_id,
      invoice_date:   form.invoice_date,
      total_amount:   totalAmount,
      paid_amount:    Number(form.paid_amount) || 0,
      discount:       Number(form.discount)    || 0,
      notes:          form.notes?.trim()       || null,
      status:         'draft',
      created_by:     form.created_by,
    })

    await Promise.all([
      purchasesRepository.addDeviceLines(invoice.id, form.device_lines),
      purchasesRepository.addProductLines(invoice.id, form.product_lines),
    ])

    if (Number(form.paid_amount) > 0) {
      await paymentsRepository.create({
        payment_type:   'purchase',
        invoice_id:     invoice.id,
        invoice_number: invoiceNumber,
        party_type:     'supplier',
        party_id:       form.supplier_id,
        amount:         Number(form.paid_amount),
        payment_method: 'cash',
        payment_date:   form.invoice_date,
        notes:          'دفعة أولى عند إنشاء الفاتورة',
        created_by:     form.created_by || null,
      })
    }

    return invoice
  },

  updatePayment: async (id: string, paidAmount: number, discount: number): Promise<PurchaseInvoice> => {
    if (paidAmount < 0) throw new Error('المبلغ المدفوع لا يمكن أن يكون سالباً')
    return purchasesRepository.update(id, { paid_amount: paidAmount, discount })
  },

  confirm: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail)                           throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status !== 'draft') throw new Error('يمكن تأكيد الفواتير المسودة فقط')

    const deviceLines  = await purchasesRepository.getDeviceLinesByInvoice(id)
    const productLines = await purchasesRepository.getProductLinesByInvoice(id)

    await Promise.all([
      purchasesRepository.updateStatus(id, 'confirmed'),
      purchasesRepository.linkDevicesToInvoice(deviceLines.map(d => d.device_id), id),
      purchasesRepository.adjustProductStock(productLines.map(l => ({ product_id: l.product_id, qty_delta: l.quantity }))),
    ])
  },

  cancel: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail)                               throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن إلغاء فاتورة مؤكدة')
    await purchasesRepository.updateStatus(id, 'cancelled')
  },

  remove: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail)                               throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    await purchasesRepository.remove(id)
  },
}
