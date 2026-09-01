import { productsRepository, type ProductWithCategory, type LowStockProduct } from '@/repositories/products.repository'
import type { Product, ProductCategory, ProductType } from '@/types/database'

export interface ProductFormData {
  category_id: string
  name: string
  sku: string
  barcode: string
  product_type: ProductType
  cost_price: number
  selling_price: number
  stock_qty: number
  reorder_level: number
  unit: string
  default_supplier_id: string
  is_active: boolean
  notes: string
  created_by: string
}

export interface CategoryFormData {
  name: string
  type: ProductType
}

export interface ProductStats {
  total: number
  active: number
  accessories: number
  spareParts: number
  lowStock: number
  totalCostValue: number
  totalSellingValue: number
}

export const productsService = {

  // ── Categories ────────────────────────────────────────────────────────────

  getAllCategories: (): Promise<ProductCategory[]> =>
    productsRepository.getAllCategories(),

  createCategory: async (form: CategoryFormData): Promise<ProductCategory> => {
    if (!form.name.trim()) throw new Error('اسم التصنيف مطلوب')
    return productsRepository.createCategory({ name: form.name.trim(), type: form.type })
  },

  updateCategory: async (id: string, form: Partial<CategoryFormData>): Promise<ProductCategory> => {
    if (form.name !== undefined && !form.name.trim()) throw new Error('اسم التصنيف مطلوب')
    return productsRepository.updateCategory(id, {
      ...(form.name !== undefined && { name: form.name.trim() }),
      ...(form.type !== undefined && { type: form.type }),
    })
  },

  removeCategory: (id: string): Promise<void> =>
    productsRepository.removeCategory(id),

  // ── Products ──────────────────────────────────────────────────────────────

  getAll: (): Promise<ProductWithCategory[]> =>
    productsRepository.getAll(),

  getById: (id: string): Promise<ProductWithCategory | null> =>
    productsRepository.getById(id),

  getLowStock: (): Promise<LowStockProduct[]> =>
    productsRepository.getLowStock(),

  getStats: async (): Promise<ProductStats> => {
    const products = await productsRepository.getAll()
    const lowStock = await productsRepository.getLowStock()
    return {
      total:             products.length,
      active:            products.filter(p => p.is_active).length,
      accessories:       products.filter(p => p.product_type === 'accessory').length,
      spareParts:        products.filter(p => p.product_type === 'spare_part').length,
      lowStock:          lowStock.length,
      totalCostValue:    products.filter(p => p.is_active).reduce((s, p) => s + p.cost_price    * p.stock_qty, 0),
      totalSellingValue: products.filter(p => p.is_active).reduce((s, p) => s + p.selling_price * p.stock_qty, 0),
    }
  },

  create: async (form: ProductFormData): Promise<Product> => {
    if (!form.name.trim())      throw new Error('اسم المنتج مطلوب')
    if (!form.category_id)      throw new Error('التصنيف مطلوب')
    if (Number(form.cost_price) < 0)    throw new Error('سعر الشراء غير صحيح')
    if (Number(form.selling_price) < 0) throw new Error('سعر البيع غير صحيح')

    return productsRepository.create({
      category_id:         form.category_id,
      name:                form.name.trim(),
      sku:                 form.sku?.trim()     || null,
      barcode:             form.barcode?.trim() || null,
      product_type:        form.product_type,
      compatible_models:   null,
      cost_price:          Number(form.cost_price)    || 0,
      selling_price:       Number(form.selling_price) || 0,
      stock_qty:           Number(form.stock_qty)     || 0,
      reorder_level:       Number(form.reorder_level) || 5,
      unit:                form.unit?.trim()          || 'قطعة',
      default_supplier_id: form.default_supplier_id   || null,
      is_active:           form.is_active ?? true,
      notes:               form.notes?.trim()         || null,
      created_by:          form.created_by,
    })
  },

  update: async (id: string, form: Partial<ProductFormData>): Promise<Product> => {
    if (form.name !== undefined && !form.name.trim()) throw new Error('اسم المنتج مطلوب')
    const payload: Record<string, unknown> = {}
    if (form.category_id         !== undefined) payload['category_id']         = form.category_id
    if (form.name                !== undefined) payload['name']                = form.name.trim()
    if (form.sku                 !== undefined) payload['sku']                 = form.sku?.trim() || null
    if (form.barcode             !== undefined) payload['barcode']             = form.barcode?.trim() || null
    if (form.product_type        !== undefined) payload['product_type']        = form.product_type
    if (form.cost_price          !== undefined) payload['cost_price']          = Number(form.cost_price) || 0
    if (form.selling_price       !== undefined) payload['selling_price']       = Number(form.selling_price) || 0
    if (form.stock_qty           !== undefined) payload['stock_qty']           = Number(form.stock_qty) || 0
    if (form.reorder_level       !== undefined) payload['reorder_level']       = Number(form.reorder_level) || 5
    if (form.unit                !== undefined) payload['unit']                = form.unit?.trim() || 'قطعة'
    if (form.default_supplier_id !== undefined) payload['default_supplier_id'] = form.default_supplier_id || null
    if (form.is_active           !== undefined) payload['is_active']           = form.is_active
    if (form.notes               !== undefined) payload['notes']               = form.notes?.trim() || null
    return productsRepository.update(id, payload as Parameters<typeof productsRepository.update>[1])
  },

  adjustStock: (id: string, delta: number): Promise<Product> =>
    productsRepository.adjustStock(id, delta),

  remove: (id: string): Promise<void> =>
    productsRepository.remove(id),
}
