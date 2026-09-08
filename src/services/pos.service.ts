// src/services/pos.service.ts
import {
  posRepository,
  type SaleDeviceLine,
  type SaleProductLine,
} from '@/repositories/pos.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import { supabase } from '@/lib/supabase'
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
  if (msg.includes('INVOICE_NOT_FOUND'))        return 'الفاتورة غير موجودة'
  if (msg.includes('INVOICE_NOT_DRAFT'))        return 'يمكن تأكيد المسودات فقط'
  if (msg.includes('INVOICE_ALREADY_CANCELLED')) return 'الفاتورة ملغاة بالفعل'
  return msg
}

export const posService = {

  getAll:           (): Promise<SaleInvoiceView[]>             => posRepository.getAll(),
  getById:          (id: string): Promise<SaleInvoiceDetail | null> => posRepository.getById(id),
  getStats:         (): Promise<PosStats>                      => posRepository.getStats(),
  getInStockDevices: (): Promise<MobileDeviceView[]>           => posRepository.getInStockDevices(),

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

    if (Number(form.paid_amount) > 0 && form.customer_id) {
      await paymentsRepository.create({
        payment_type:   'sale',
        invoice_id:     invoice.id,
        invoice_number: invoiceNumber,
        party_type:     'customer',
        party_id:       form.customer_id,
        amount:         Number(form.paid_amount),
        payment_method: 'cash',
        payment_date:   form.invoice_date,
        notes:          'دفعة أولى عند إنشاء الفاتورة',
        created_by:     form.created_by || null,
      })
    }

    return invoice
  },

  // ── atomic DB transaction via RPC ─────────────────────────────────────────
  confirm: async (id: string, customerId: string | null, soldById: string): Promise<void> => {
    const { error } = await supabase.rpc('confirm_sale_invoice', {
      p_invoice_id:  id,
      p_customer_id: customerId ?? null,
      p_sold_by_id:  soldById,
    } as never)
    if (error) throw new Error(parseRpcError(error.message))
  },

  // ── atomic DB transaction via RPC ─────────────────────────────────────────
  cancel: async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('cancel_sale_invoice', {
      p_invoice_id: id,
    } as never)
    if (error) throw new Error(parseRpcError(error.message))
  },

  remove: async (id: string): Promise<void> => {
    const detail = await posRepository.getById(id)
    if (!detail)                               throw new Error('الفاتورة غير موجودة')
    if (detail.invoice.status === 'confirmed') throw new Error('لا يمكن حذف فاتورة مؤكدة')
    await posRepository.remove(id)
  },
}
