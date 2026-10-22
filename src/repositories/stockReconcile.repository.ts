// src/repositories/stockReconcile.repository.ts
import { supabase } from '@/lib/supabase'
import type { DeviceStatus } from '@/types/database'
import type { ReconcileDevice } from '@/types/stockReconcile'

interface DeviceRow {
  id:            string
  imei1:         string
  imei2:         string | null
  brand_name:    string
  model_name:    string
  storage:       string | null
  color:         string | null
  battery_health: number | string | null
  status:        DeviceStatus
  cost_price:    number | string
  selling_price: number | string | null
  purchase_date: string
}

export const stockReconcileRepository = {

  // كل الأجهزة (ماعدا الملغي والمحذوف) — عشان نعرف حالة أي كود اتمسح
  getDevices: async (): Promise<ReconcileDevice[]> => {
    const { data, error } = await supabase
      .from('mobile_devices_view')
      .select('id, imei1, imei2, brand_name, model_name, storage, color, battery_health, status, cost_price, selling_price, purchase_date')
      .eq('is_deleted', false)
      .neq('status', 'cancelled')
      .limit(2000)
    if (error) throw error

    return ((data ?? []) as unknown as DeviceRow[]).map(d => ({
      ...d,
      battery_health: d.battery_health == null ? null : Number(d.battery_health),
      cost_price:    Number(d.cost_price ?? 0),
      selling_price: d.selling_price == null ? null : Number(d.selling_price),
    }))
  },
}
