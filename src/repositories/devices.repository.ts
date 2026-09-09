// src/repositories/devices.repository.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import type { MobileDevice, MobileDeviceView, MobileBrand, MobileModel, DeviceStatus } from '@/types/database'

type DeviceInsert = Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>
type DeviceUpdate = Partial<Omit<MobileDevice, 'id' | 'created_at' | 'updated_at'>>

export interface DeviceStatusCount {
  status:            DeviceStatus
  count:             number
  total_cost_value:  number
  total_sell_value:  number
}

export const devicesRepository = {

  // ── Devices ───────────────────────────────────────────────────────────────

  getAll: async (): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .from('mobile_devices_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000)
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

  // ── Aggregate stats — no full table fetch ─────────────────────────────────

  getStatusCounts: async (): Promise<DeviceStatusCount[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('status, cost_price, selling_price')
    if (error) throw error

    const map = new Map<string, DeviceStatusCount>()
    for (const row of (data ?? []) as { status: string; cost_price: number; selling_price: number | null }[]) {
      const s = row.status
      if (!map.has(s)) map.set(s, { status: s as DeviceStatus, count: 0, total_cost_value: 0, total_sell_value: 0 })
      const e = map.get(s)!
      e.count++
      if (s === 'in_stock') {
        e.total_cost_value += Number(row.cost_price    ?? 0)
        e.total_sell_value += Number(row.selling_price ?? 0)
      }
    }
    return Array.from(map.values())
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

  softDelete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mobile_devices')
      .update({ is_deleted: true } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Brands ────────────────────────────────────────────────────────────────

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

  // ── Models ────────────────────────────────────────────────────────────────

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
