import { supabase } from '@/lib/supabase'
import type { MobileDevice, MobileDeviceView, MobileBrand, MobileModel } from '@/types/database'

type DeviceInsert = Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>
type DeviceUpdate = Partial<Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>>

export const devicesRepository = {

  // ── Devices ──────────────────────────────────────────────────────────────

  getAll: async (): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        *,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        ),
        suppliers!supplier_id ( name ),
        customers!sold_to_customer_id ( name, phone ),
        added_by_profile:profiles!added_by ( full_name ),
        sold_by_profile:profiles!sold_by ( full_name )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error

    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>
      const model   = r['mobile_models']  as Record<string, unknown> | null
      const brand   = model ? (model['mobile_brands'] as Record<string, unknown> | null) : null
      const sup     = r['suppliers']      as Record<string, unknown> | null
      const cust    = r['customers']      as Record<string, unknown> | null
      const addedBy = r['added_by_profile'] as Record<string, unknown> | null
      const soldBy  = r['sold_by_profile']  as Record<string, unknown> | null
      return {
        ...r,
        brand_name:      (brand?.['name']      as string)  ?? '—',
        model_name:      (model?.['name']      as string)  ?? '—',
        supplier_name:   (sup?.['name']        as string)  ?? '—',
        customer_name:   (cust?.['name']       as string | null) ?? null,
        customer_phone:  (cust?.['phone']      as string | null) ?? null,
        added_by_name:   (addedBy?.['full_name'] as string) ?? '—',
        sold_by_name:    (soldBy?.['full_name']  as string | null) ?? null,
      } as MobileDeviceView
    })
  },

  getById: async (id: string): Promise<MobileDeviceView | null> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        *,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        ),
        suppliers!supplier_id ( name ),
        customers!sold_to_customer_id ( name, phone ),
        added_by_profile:profiles!added_by ( full_name ),
        sold_by_profile:profiles!sold_by ( full_name )
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return null

    const r       = data as unknown as Record<string, unknown>
    const model   = r['mobile_models']    as Record<string, unknown> | null
    const brand   = model ? (model['mobile_brands'] as Record<string, unknown> | null) : null
    const sup     = r['suppliers']        as Record<string, unknown> | null
    const cust    = r['customers']        as Record<string, unknown> | null
    const addedBy = r['added_by_profile'] as Record<string, unknown> | null
    const soldBy  = r['sold_by_profile']  as Record<string, unknown> | null

    return {
      ...r,
      brand_name:     (brand?.['name']        as string)        ?? '—',
      model_name:     (model?.['name']        as string)        ?? '—',
      supplier_name:  (sup?.['name']          as string)        ?? '—',
      customer_name:  (cust?.['name']         as string | null) ?? null,
      customer_phone: (cust?.['phone']        as string | null) ?? null,
      added_by_name:  (addedBy?.['full_name'] as string)        ?? '—',
      sold_by_name:   (soldBy?.['full_name']  as string | null) ?? null,
    } as MobileDeviceView
  },

  lookupByImei: async (imei: string): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .rpc('lookup_device_by_imei', { p_imei: imei } as never)
    if (error) throw error
    return (data ?? []) as MobileDeviceView[]
  },

  create: async (payload: DeviceInsert): Promise<MobileDevice> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as MobileDevice
  },

  update: async (id: string, payload: DeviceUpdate): Promise<MobileDevice> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as MobileDevice
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mobile_devices')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ── Brands ───────────────────────────────────────────────────────────────

  getAllBrands: async (): Promise<MobileBrand[]> => {
    const { data, error } = await supabase
      .from('mobile_brands')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []) as MobileBrand[]
  },

  createBrand: async (name: string): Promise<MobileBrand> => {
    const { data, error } = await supabase
      .from('mobile_brands')
      .insert({ name } as never)
      .select()
      .single()
    if (error) throw error
    return data as MobileBrand
  },

  // ── Models ───────────────────────────────────────────────────────────────

  getModelsByBrand: async (brandId: string): Promise<MobileModel[]> => {
    const { data, error } = await supabase
      .from('mobile_models')
      .select('*')
      .eq('brand_id', brandId)
      .order('name')
    if (error) throw error
    return (data ?? []) as MobileModel[]
  },

  createModel: async (brandId: string, name: string): Promise<MobileModel> => {
    const { data, error } = await supabase
      .from('mobile_models')
      .insert({ brand_id: brandId, name } as never)
      .select()
      .single()
    if (error) throw error
    return data as MobileModel
  },
}
