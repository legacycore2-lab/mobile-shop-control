// src/services/pos.service.ts
import {
  posRepository,
  type SaleDeviceLine,
  type SaleProductLine,
} from '@/repositories/pos.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'
import type { MobileDeviceView, SaleInvoice, SaleInvoiceView, SaleInvoiceDetail } from '@/types/database'

export type { SaleDeviceLine, SaleProductLine, SaleInvoiceView, SaleInvoiceDetail }

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
  totalRevenue: number; totalPaid: number; totalDue: number; totalCostSold: number
}

function parseRpcError(msg: string): string {
  if (msg.includes('INVOICE_NOT_FOUND'))         return 'الفاتورة غير موجودة'
  if (msg.includes('INVOICE_NOT_DRAFT'))         return 'يمكن تأكيد المسودات فقط'
  if (msg.includes('INVOICE_ALREADY_CANCELLED')) return 'الفاتورة ملغاة بالفعل'
  return msg
}

export const posService = {

  getAll:            (): Promise<SaleInvoiceView[]>               => posRepository.getAll(),
  getById:           (id: string): Promise<SaleInvoiceDetail | null> => posRepository.getById(id),
  getStats:          (): Promise<PosStats>                         => posRepository.getStats(),
  getInStockDevices: (): Promise<MobileDeviceView[]>               => posRepository.getInStockDevices(),

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

    const priceMap = new Map(form.device_lines.map(l => [l.device_id, l.actual_selling_price]))

    await Promise.all([
      posRepository.addDeviceLines(invoice.id, form.device_lines),
      posRepository.addProductLines(invoice.id, form.product_lines),
      posRepository.markDevicesSold(
        form.device_lines.map(l => l.device_id),
        invoice.id,
        form.customer_id || null,
        form.created_by || '',
        priceMap,
      ),
      posRepository.adjustProductStock(form.product_lines.map(l => ({ product_id: l.product_id, qty_delta: -l.quantity }))),
    ])

    if (Number(form.paid_amount) > 0) {
      await paymentsRepository.create({
        payment_type:   'sale',
        invoice_id:     invoice.id,
        invoice_number: invoiceNumber,
        party_type:     'customer',
        party_id:       form.customer_id || null,
        amount:         Number(form.paid_amount),
        payment_method: 'cash',
        payment_date:   form.invoice_date,
        notes:          'دفعة أولى عند إنشاء الفاتورة',
        created_by:     form.created_by || null,
      })
    }

    void (async () => {
      try {
        const detail       = await posRepository.getById(invoice.id)
        const customerName = detail?.invoice.customer_name ?? 'بدون عميل'
        const description  = `إنشاء فاتورة بيع ${invoiceNumber}`
        await logAction({
          userId:      form.created_by,
          action:      'create',
          table:       'sale_invoices',
          recordId:    invoice.id,
          description,
          newData:     { invoice_number: invoiceNumber, customer: customerName },
        })
      } catch { /* silent */ }
    })()

    return invoice
  },

  confirm: async (id: string, customerId: string | null, soldById: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail) throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status !== 'draft') throw new Error('يمكن تأكيد المسودات فقط')
    const { error } = await supabase
      .from('sale_invoices')
      .update({ status: 'confirmed' } as never)
      .eq('id', id)
    if (error) throw error
    void logAction({ userId: soldById, action: 'confirm', table: 'sale_invoices', recordId: id, description: `تأكيد فاتورة البيع ${detail.invoice.invoice_number}`, newData: { invoice_number: detail.invoice.invoice_number } })
  },

  cancel: async (id: string, userId?: string): Promise<void> => {
    const { error } = await supabase.rpc('cancel_sale_invoice', { p_invoice_id: id } as never)
    if (error) throw new Error(parseRpcError(error.message))
    if (userId) {
      void (async () => {
        const det = await posRepository.getById(id).catch(() => null)
        const num = det?.invoice.invoice_number ?? id.slice(0,8)
        await logAction({ userId, action: 'cancel', table: 'sale_invoices', recordId: id,
          description: `إلغاء فاتورة البيع ${num}` })
      })()
    }
  },

  remove: async (id: string, userId?: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail)                               throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    if (userId) void logAction({ userId, action: 'delete', table: 'sale_invoices', recordId: id, description: `حذف فاتورة البيع ${detail.invoice.invoice_number}`, oldData: { invoice_number: detail.invoice.invoice_number } })
    await posRepository.remove(id)
  },
}
