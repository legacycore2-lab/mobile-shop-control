// src/services/purchases.service.ts
import {
  purchasesRepository,
  type InvoiceDeviceLine,
  type InvoiceProductLine,
} from '@/repositories/purchases.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'
import type { PurchaseInvoice, PurchaseInvoiceView, PurchaseInvoiceDetail } from '@/types/database'

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

function parseRpcError(msg: string): string {
  if (msg.includes('INVOICE_NOT_FOUND'))         return 'الفاتورة غير موجودة'
  if (msg.includes('INVOICE_NOT_DRAFT'))         return 'يمكن تأكيد الفواتير المسودة فقط'
  if (msg.includes('INVOICE_ALREADY_CANCELLED')) return 'الفاتورة ملغاة بالفعل'
  return msg
}

export const purchasesService = {

  getAll:    (): Promise<PurchaseInvoiceView[]>                  => purchasesRepository.getAll(),
  getById:   (id: string): Promise<PurchaseInvoiceDetail | null> => purchasesRepository.getById(id),
  getStats:  (): Promise<PurchaseStats>                          => purchasesRepository.getStats(),
  nextInvoiceNumber: (): Promise<string>                         => purchasesRepository.nextInvoiceNumber(),
  getUnlinkedDevicesBySupplier: (supplierId: string)             => purchasesRepository.getUnlinkedDevicesBySupplier(supplierId),

  create: async (form: PurchaseFormData): Promise<PurchaseInvoice> => {
    if (!form.supplier_id)  throw new Error('المورد مطلوب')
    if (!form.invoice_date) throw new Error('تاريخ الفاتورة مطلوب')
    if (!form.device_lines.length && !form.product_lines.length)
      throw new Error('يجب إضافة جهاز أو منتج واحد على الأقل')

    const invoiceNumber = await purchasesRepository.nextInvoiceNumber()
    const deviceTotal   = form.device_lines .reduce((s, l) => s + l.cost_price,             0)
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

    // جيب التفاصيل الكاملة للـ logging بعد الإنشاء
    void (async () => {
      try {
        const detail = await purchasesRepository.getById(invoice.id)
        const supplierName = detail?.invoice.supplier_name ?? '—'
        const description  = `إنشاء فاتورة شراء ${invoiceNumber}`
        await logAction({
          userId:      form.created_by,
          action:      'create',
          table:       'purchase_invoices',
          recordId:    invoice.id,
          description,
          newData:     { invoice_number: invoiceNumber, supplier: supplierName },
        })
      } catch { /* silent */ }
    })()

    return invoice
  },

  updatePayment: async (id: string, paidAmount: number, discount: number, userId?: string): Promise<PurchaseInvoice> => {
    if (paidAmount < 0) throw new Error('المبلغ المدفوع لا يمكن أن يكون سالباً')
    const result = await purchasesRepository.update(id, { paid_amount: paidAmount, discount })
    if (userId) {
      void logAction({ userId, action: 'pay', table: 'purchase_invoices', recordId: id, description: `دفع ${paidAmount} ج على فاتورة الشراء`, newData: { paid_amount: paidAmount, discount } })
    }
    return result
  },

  confirm: async (id: string, userId?: string): Promise<void> => {
    const { error } = await supabase.rpc('confirm_purchase_invoice', { p_invoice_id: id } as never)
    if (error) throw new Error(parseRpcError(error.message))
    if (userId) {
      void (async () => {
        const det = await purchasesRepository.getById(id).catch(() => null)
        const num = det?.invoice.invoice_number ?? id.slice(0,8)
        await logAction({ userId, action: 'confirm', table: 'purchase_invoices', recordId: id,
          description: `تأكيد فاتورة الشراء ${num}` })
      })()
    }
  },

  cancel: async (id: string, userId?: string): Promise<void> => {
    const { error } = await supabase.rpc('cancel_purchase_invoice', { p_invoice_id: id } as never)
    if (error) throw new Error(parseRpcError(error.message))
    if (userId) {
      void (async () => {
        const det = await purchasesRepository.getById(id).catch(() => null)
        const num = det?.invoice.invoice_number ?? id.slice(0,8)
        await logAction({ userId, action: 'cancel', table: 'purchase_invoices', recordId: id,
          description: `إلغاء فاتورة الشراء ${num}` })
      })()
    }
  },

  remove: async (id: string, userId?: string): Promise<void> => {
    const detail = await purchasesRepository.getById(id)
    if (!detail)                               throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    if (userId) void logAction({ userId, action: 'delete', table: 'purchase_invoices', recordId: id, description: `حذف فاتورة الشراء ${detail.invoice.invoice_number}`, oldData: { invoice_number: detail.invoice.invoice_number } })
    await purchasesRepository.remove(id)
  },
}
