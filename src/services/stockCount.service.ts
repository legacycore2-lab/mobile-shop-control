// src/services/stockCount.service.ts
import { stockCountRepository } from '@/repositories/stockCount.repository'
import { fetchActiveEmployees, fetchEmployees } from '@/repositories/attendance.repository'
import { whatsappUrl } from '@/lib/whatsapp'
import type { Employee } from '@/types/database'
import type {
  AnswerDraft, CreateStockCountInput, PublicStockCount, StockCountAnswer, StockCountItem,
  StockCountSessionView, StockCountSummary,
} from '@/types/stockCount'

const MAX_ITEMS_PER_TYPE = 50
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function summarize(items: StockCountItem[]): StockCountSummary {
  const correct = items.filter(i => i.is_correct === true).length
  const wrong   = items.filter(i => i.is_correct === false).length
  return { total: items.length, correct, wrong, unanswered: items.length - correct - wrong }
}

// فرق العدد: موجب = زيادة عن النظام، سالب = عجز
export function itemDiff(item: StockCountItem): number {
  return item.is_correct === false && item.counted_qty != null ? item.counted_qty - item.system_qty : 0
}

// رسالة خطأ لرد واحد، أو null لو الرد سليم
export function getDraftError(item: StockCountItem, draft: AnswerDraft): string | null {
  if (draft.isCorrect === null) return 'لم يتم الرد'
  if (draft.isCorrect) return null
  const raw = draft.countedQty.trim()
  if (!raw) return 'اكتب العدد الصحيح'
  if (!/^\d+$/.test(raw)) return 'العدد لازم يكون رقم صحيح'
  if (Number(raw) === item.system_qty) return 'ده نفس رقم النظام — اختار صح'
  return null
}

export function canSubmit(items: StockCountItem[], drafts: Record<string, AnswerDraft>): boolean {
  return items.length > 0 && items.every(i => {
    const draft = drafts[i.id]
    return draft !== undefined && getDraftError(i, draft) === null
  })
}

export function buildStockCountLink(token: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/stock-count/${token}`
}

export function buildStockCountMessage(session: StockCountSessionView): string {
  return [
    `أهلاً ${session.employee_name}،`,
    `جرد اليوم (${session.count_date}) — ${session.items.length} صنف.`,
    'افتح الرابط وعلّم كل صنف صح أو غلط (ولو غلط اكتب العدد الصحيح):',
    buildStockCountLink(session.access_token),
    '',
    'الشافعي ستور',
  ].join('\n')
}

export function buildWhatsappLink(session: StockCountSessionView): string | null {
  return session.employee_phone ? whatsappUrl(session.employee_phone, buildStockCountMessage(session)) : null
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_ITEMS_PER_TYPE) {
    throw new Error(`${label} لازم يكون رقم من 0 لـ ${MAX_ITEMS_PER_TYPE}`)
  }
}

export const stockCountService = {

  getEmployees: (): Promise<Employee[]> => fetchActiveEmployees(),

  getSessions: async (): Promise<StockCountSessionView[]> => {
    const sessions = await stockCountRepository.getSessions()
    if (!sessions.length) return []

    const [items, employees] = await Promise.all([
      stockCountRepository.getItems(sessions.map(s => s.id)),
      fetchEmployees(),
    ])
    const empById = new Map(employees.map(e => [e.id, e]))

    return sessions.map(s => {
      const sessionItems: StockCountItem[] = items
        .filter(i => i.session_id === s.id)
        .map(i => ({
          id: i.id, item_type: i.item_type, item_name: i.item_name,
          system_qty: i.system_qty, is_correct: i.is_correct, counted_qty: i.counted_qty,
        }))
        .sort((a, b) => a.item_type.localeCompare(b.item_type) || a.item_name.localeCompare(b.item_name, 'ar'))
      const emp = empById.get(s.employee_id)
      return {
        ...s,
        employee_name:  emp?.name ?? '—',
        employee_phone: emp?.phone ?? null,
        items:          sessionItems,
        summary:        summarize(sessionItems),
      }
    })
  },

  create: (input: CreateStockCountInput): Promise<string> => {
    if (!input.employeeId) throw new Error('اختار المسئول عن الجرد')
    assertCount(input.productsCount, 'عدد المنتجات')
    assertCount(input.modelsCount, 'عدد الموبايلات')
    if (input.productsCount + input.modelsCount === 0) throw new Error('لازم تختار صنف واحد على الأقل')
    return stockCountRepository.create(input.employeeId, input.productsCount, input.modelsCount)
  },

  getByToken: (token: string): Promise<PublicStockCount | null> =>
    UUID_RE.test(token) ? stockCountRepository.getByToken(token) : Promise.resolve(null),

  submit: async (token: string, items: StockCountItem[], drafts: Record<string, AnswerDraft>): Promise<void> => {
    const answers: StockCountAnswer[] = items.map(item => {
      const draft = drafts[item.id]
      if (!draft || getDraftError(item, draft) !== null) {
        throw new Error(`راجع الرد على: ${item.item_name}`)
      }
      return {
        item_id:     item.id,
        is_correct:  draft.isCorrect === true,
        counted_qty: draft.isCorrect ? null : Number(draft.countedQty.trim()),
      }
    })
    await stockCountRepository.submit(token, answers)
  },
}
