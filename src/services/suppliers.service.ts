import { suppliersRepository } from '@/repositories/suppliers.repository'
import type { Supplier } from '@/types/database'

export interface SupplierFormData {
  name: string
  phone: string
  address: string
  opening_balance: number
  notes: string
  is_active: boolean
  created_by: string
}

export interface SupplierStats {
  total: number
  active: number
  inactive: number
  totalBalance: number
}

export const suppliersService = {

  getAll: () => suppliersRepository.getAll(),

  getById: (id: string) => suppliersRepository.getById(id),

  getStats: async (): Promise<SupplierStats> => {
    const suppliers = await suppliersRepository.getAll()
    return {
      total:        suppliers.length,
      active:       suppliers.filter(s => s.is_active).length,
      inactive:     suppliers.filter(s => !s.is_active).length,
      totalBalance: suppliers.reduce((sum, s) => sum + (s.opening_balance ?? 0), 0),
    }
  },

  create: async (form: SupplierFormData): Promise<Supplier> => {
    if (!form.name?.trim()) throw new Error('اسم المورد مطلوب')
    return suppliersRepository.create({
      name:             form.name.trim(),
      phone:            form.phone?.trim() || null,
      address:          form.address?.trim() || null,
      opening_balance:  Number(form.opening_balance) || 0,
      notes:            form.notes?.trim() || null,
      is_active:        form.is_active ?? true,
      created_by:       form.created_by,
    })
  },

  update: async (id: string, form: Partial<SupplierFormData>): Promise<Supplier> => {
    if (form.name !== undefined && !form.name?.trim()) throw new Error('اسم المورد مطلوب')
    return suppliersRepository.update(id, {
      ...(form.name            !== undefined && { name: form.name.trim() }),
      ...(form.phone           !== undefined && { phone: form.phone?.trim() || null }),
      ...(form.address         !== undefined && { address: form.address?.trim() || null }),
      ...(form.opening_balance !== undefined && { opening_balance: Number(form.opening_balance) || 0 }),
      ...(form.notes           !== undefined && { notes: form.notes?.trim() || null }),
      ...(form.is_active       !== undefined && { is_active: form.is_active }),
    })
  },

  remove: (id: string) => suppliersRepository.remove(id),
}
