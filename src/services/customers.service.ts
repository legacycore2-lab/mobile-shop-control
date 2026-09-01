import { customersRepository } from '@/repositories/customers.repository'
import type { Customer } from '@/types/database'

export interface CustomerFormData {
  name: string
  phone: string
  address: string
  opening_balance: number
  notes: string
  is_active: boolean
  created_by: string
}

export interface CustomerStats {
  total: number
  active: number
  inactive: number
  totalBalance: number
}

export const customersService = {

  getAll: () => customersRepository.getAll(),

  getById: (id: string) => customersRepository.getById(id),

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
    return customersRepository.create(payload as never)
  },

  update: async (id: string, form: Partial<CustomerFormData>): Promise<Customer> => {
    if (form.name !== undefined && !form.name?.trim()) throw new Error('اسم العميل مطلوب')
    const payload = {
      ...(form.name            !== undefined && { name: form.name.trim() }),
      ...(form.phone           !== undefined && { phone: form.phone?.trim() || null }),
      ...(form.address         !== undefined && { address: form.address?.trim() || null }),
      ...(form.opening_balance !== undefined && { opening_balance: Number(form.opening_balance) || 0 }),
      ...(form.notes           !== undefined && { notes: form.notes?.trim() || null }),
      ...(form.is_active       !== undefined && { is_active: form.is_active }),
    }
    return customersRepository.update(id, payload as never)
  },

  remove: (id: string) => customersRepository.remove(id),
}
