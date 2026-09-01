import { posRepository, type SaleInvoiceView, type SaleInvoiceDetail, type SaleDeviceLine, type SaleProductLine } from '@/repositories/pos.repository'
import type { MobileDeviceView } from '@/types/database'

export type { SaleInvoiceView, SaleInvoiceDetail, SaleDeviceLine, SaleProductLine }

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
  total: number; draft: number; confirmed: number
  totalRevenue: number; totalPaid: number; totalDue: number
}

export const posService = {

  getAll: (): Promise<SaleInvoiceView[]> => posRepository.getAll(),

  getById: (id: string): Promise<SaleInvoiceDetail | null> => posRepository.getById(id),

  getStats: (): Promise<PosStats> => posRepository.getStats(),

  getInStockDevices: (): Promise<MobileDeviceView[]> => posRepository.getInStockDevices(),

  create: async (form: SaleFormData) => {
    if (!form.device_lines.length && !form.product_lines.length)
      throw new Error('يجب إضافة جهاز أو منتج واحد على الأقل')

    const invoiceNumber = await posRepository.nextInvoiceNumber()

    const deviceTotal  = form.device_lines .reduce((s, l) => s + l.actual_selling_price,  0)
    const productTotal = form.product_lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const totalAmount  = Math.max(0, deviceTotal + productTotal - (form.discount ?? 0))

    const invoice = await posRepository.create({
      invoice_number: invoiceNumber,
      customer_id:    form.customer_id || null,
      invoice_date:   form.invoice_date,
      total_amount:   totalAmount,
      paid_amount:    Number(form.paid_amount)  || 0,
      discount:       Number(form.discount)     || 0,
      notes:          form.notes?.trim()        || null,
      status:         'draft',
      created_by:     form.created_by,
    })

    await Promise.all([
      posRepository.addDeviceLines(invoice.id, form.device_lines),
      posRepository.addProductLines(invoice.id, form.product_lines),
    ])

    return invoice
  },

  confirm: async (id: string, customerId: string | null, soldById: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status !== 'draft') throw new Error('يمكن تأكيد المسودات فقط')
    await posRepository.confirm(id, customerId, soldById)
  },

  cancel: async (id: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن إلغاء فاتورة مؤكدة')
    await posRepository.cancel(id)
  },

  remove: async (id: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    await posRepository.remove(id)
  },
}
