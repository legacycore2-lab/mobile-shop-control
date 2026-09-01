import { purchasesRepository, type InvoiceDeviceLine, type InvoiceProductLine, type InvoiceDetail } from '@/repositories/purchases.repository'
import type { PurchaseInvoice, PurchaseInvoiceView } from '@/types/database'

export type { InvoiceDetail }

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

  getAll: (): Promise<PurchaseInvoiceView[]> => purchasesRepository.getAll(),

  getById: (id: string): Promise<InvoiceDetail | null> => purchasesRepository.getById(id),

  getStats: (): Promise<PurchaseStats> => purchasesRepository.getStats(),

  getUnlinkedDevicesBySupplier: (supplierId: string) =>
    purchasesRepository.getUnlinkedDevicesBySupplier(supplierId),

  nextInvoiceNumber: (): Promise<string> => purchasesRepository.nextInvoiceNumber(),

  create: async (form: PurchaseFormData): Promise<PurchaseInvoice> => {
    if (!form.supplier_id)  throw new Error('المورد مطلوب')
    if (!form.invoice_date) throw new Error('تاريخ الفاتورة مطلوب')
    if (!form.device_lines.length && !form.product_lines.length)
      throw new Error('يجب إضافة جهاز أو منتج واحد على الأقل')

    const invoiceNumber = await purchasesRepository.nextInvoiceNumber()

    const deviceTotal  = form.device_lines .reduce((s, l) => s + l.cost_price,           0)
    const productTotal = form.product_lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const totalAmount  = deviceTotal + productTotal - (form.discount ?? 0)

    const invoice = await purchasesRepository.create({
      invoice_number: invoiceNumber,
      supplier_id:    form.supplier_id,
      invoice_date:   form.invoice_date,
      total_amount:   Math.max(0, totalAmount),
      paid_amount:    Number(form.paid_amount)  || 0,
      discount:       Number(form.discount)     || 0,
      notes:          form.notes?.trim()        || null,
      status:         'draft',
      created_by:     form.created_by,
    })

    await Promise.all([
      purchasesRepository.addDeviceLines(invoice.id, form.device_lines),
      purchasesRepository.addProductLines(invoice.id, form.product_lines),
    ])

    return invoice
  },

  updatePayment: async (id: string, paidAmount: number, discount: number): Promise<PurchaseInvoice> => {
    if (paidAmount < 0) throw new Error('المبلغ المدفوع لا يمكن أن يكون سالباً')
    return purchasesRepository.update(id, {
      paid_amount: paidAmount,
      discount:    discount,
    })
  },

  confirm: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status !== 'draft') throw new Error('يمكن تأكيد الفواتير المسودة فقط')
    await purchasesRepository.confirm(id)
  },

  cancel: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن إلغاء فاتورة مؤكدة')
    await purchasesRepository.cancel(id)
  },

  remove: async (id: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    await purchasesRepository.remove(id)
  },
}
