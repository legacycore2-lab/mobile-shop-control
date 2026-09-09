// src/services/expenses.service.ts
import { expensesRepository, type ExpenseInsert } from '@/repositories/expenses.repository'
import { logAction } from '@/lib/audit'
import type { ExpenseCategory, ExpenseView } from '@/types/database'

export interface ExpenseFormData {
  category_id: string; amount: string; description: string
  expense_date: string; payment_method: string
  reference_number: string; notes: string; created_by: string
}

export const expensesService = {

  getCategories:  (): Promise<ExpenseCategory[]> => expensesRepository.getCategories(),
  createCategory: (name: string): Promise<ExpenseCategory> => expensesRepository.createCategory(name),
  getAll:         (): Promise<ExpenseView[]>      => expensesRepository.getAll(),
  getStats:       () => expensesRepository.getStats(),

  create: async (form: ExpenseFormData): Promise<ExpenseView> => {
    const amt = Number(form.amount)
    if (!amt || amt <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')
    if (!form.expense_date) throw new Error('التاريخ مطلوب')
    const payload: ExpenseInsert = {
      category_id:      form.category_id || null,
      amount:           amt,
      description:      form.description.trim() || null,
      expense_date:     form.expense_date,
      payment_method:   form.payment_method || 'cash',
      reference_number: form.reference_number.trim() || null,
      notes:            form.notes.trim() || null,
      created_by:       form.created_by || null,
    }
    const result = await expensesRepository.create(payload)
    if (form.created_by) void logAction({ userId: form.created_by, action: 'create', table: 'expenses', recordId: result.id, newData: { amount: amt, description: payload.description, expense_date: payload.expense_date } })
    return result
  },

  update: async (id: string, form: Partial<ExpenseFormData>, userId?: string): Promise<void> => {
    const payload: Partial<ExpenseInsert> = {}
    if (form.category_id     !== undefined) payload.category_id      = form.category_id || null
    if (form.amount           !== undefined) payload.amount           = Number(form.amount)
    if (form.description      !== undefined) payload.description      = form.description.trim() || null
    if (form.expense_date     !== undefined) payload.expense_date     = form.expense_date
    if (form.payment_method   !== undefined) payload.payment_method   = form.payment_method
    if (form.reference_number !== undefined) payload.reference_number = form.reference_number.trim() || null
    if (form.notes            !== undefined) payload.notes            = form.notes.trim() || null
    await expensesRepository.update(id, payload)
    if (userId) void logAction({ userId, action: 'update', table: 'expenses', recordId: id, newData: payload as Record<string, unknown> })
  },

  remove: async (id: string, userId?: string): Promise<void> => {
    if (userId) void logAction({ userId, action: 'delete', table: 'expenses', recordId: id })
    return expensesRepository.remove(id)
  },
}
