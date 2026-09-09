// src/services/customers.service.ts
import { customersRepository } from '@/repositories/customers.repository'
import { logAction } from '@/lib/audit'
import type { Customer } from '@/types/database'

export interface CustomerFormData {
  name: string; phone: string; address: string
  opening_balance: number; notes: string
  is_active: boolean; created_by: string
}

export interface CustomerStats {
  total: number; active: number; inactive: number; totalBalance: number
}

export const customersService = {

  getAll:   () => customersRepository.getAll(),
  getById:  (id: string) => customersRepository.getById(id),

  getStats: async (): Promise<CustomerStats> => {
    const customers = await customersRepository.getAll()
    return {
      total:        customers.length,
      active:       customers.filter(c => c.is_active).length,
      inactive:     customers.filter(c => !c.is_active).length,
      totalBalance: customers.reduce((sum, c) => sum + (c.opening_balance ?? 0), 0),
    }
  },

  create: async (form: CustomerFormData): Promise<Customer> => {
    if (!form.name?.trim()) throw new Error('اسم العميل مطلوب')
    const payload = {
      name:            form.name.trim(),
      phone:           form.phone?.trim()   || null,
      address:         form.address?.trim() || null,
      opening_balance: Number(form.opening_balance) || 0,
      notes:           form.notes?.trim()   || null,
      is_active:       form.is_active ?? true,
      created_by:      form.created_by,
    }
    const result = await customersRepository.create(payload as never)
    void logAction({ userId: form.created_by, action: 'create', table: 'customers', recordId: result.id, description: `إضافة عميل جديد: ${payload.name}`, newData: { name: payload.name, phone: payload.phone } })
    return result
  },

  update: async (id: string, form: Partial<CustomerFormData>, userId?: string): Promise<Customer> => {
    if (form.name !== undefined && !form.name?.trim()) throw new Error('اسم العميل مطلوب')
    const payload = {
      ...(form.name            !== undefined && { name: form.name.trim() }),
      ...(form.phone           !== undefined && { phone: form.phone?.trim() || null }),
      ...(form.address         !== undefined && { address: form.address?.trim() || null }),
      ...(form.opening_balance !== undefined && { opening_balance: Number(form.opening_balance) || 0 }),
      ...(form.notes           !== undefined && { notes: form.notes?.trim() || null }),
      ...(form.is_active       !== undefined && { is_active: form.is_active }),
    }
    const result = await customersRepository.update(id, payload as never)
    if (userId) void logAction({ userId, action: 'update', table: 'customers', recordId: id, description: `تعديل بيانات عميل`, newData: payload as Record<string, unknown> })
    return result
  },

  remove: async (id: string, userId?: string): Promise<void> => {
    if (userId) {
      const c = await customersRepository.getById(id)
      void logAction({ userId, action: 'delete', table: 'customers', recordId: id, description: c ? `حذف العميل: ${c.name}` : 'حذف عميل', oldData: c ? { name: c.name } : undefined })
    }
    return customersRepository.remove(id)
  },
}
