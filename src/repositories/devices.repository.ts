// src/repositories/devices.repository.ts
import { supabase } from '@/lib/supabase'
import type { MobileDevice, MobileDeviceView, MobileBrand, MobileModel } from '@/types/database'

type DeviceInsert = Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>
type DeviceUpdate = Partial<Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>>

export const devicesRepository = {

  // ── Devices ──────────────────────────────────────────────────────────────

  getAll: async (): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .from('mobile_devices_view')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as MobileDeviceView[]
  },

  getById: async (id: string): Promise<MobileDeviceView | null> => {
    const { data, error } = await supabase
      .from('mobile_devices_view')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as unknown as MobileDeviceView | null
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

  // ── Soft Delete — يضع is_deleted = true بدل الحذف الفعلي ──────────────
  softDelete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mobile_devices')
      .update({ is_deleted: true } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Hard Delete — للطوارئ فقط (مش مستخدم في الواجهة) ────────────────
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
