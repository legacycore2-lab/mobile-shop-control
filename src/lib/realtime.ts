// src/lib/realtime.ts
// Supabase Realtime — listens to all important tables and invalidates TanStack Query cache

import { supabase } from './supabase'
import type { QueryClient } from '@tanstack/react-query'

// Tables → query keys to invalidate
const TABLE_KEYS: Record<string, string[][]> = {
  mobile_devices:           [['devices'], ['reports']],
  purchase_invoices:        [['purchases'], ['reports'], ['ledger', 'suppliers']],
  purchase_invoice_devices: [['purchases']],
  purchase_invoice_products:[['purchases']],
  sale_invoices:            [['sales'], ['pos'], ['reports'], ['ledger', 'customers']],
  sale_invoice_devices:     [['sales'], ['pos']],
  sale_invoice_products:    [['sales'], ['pos']],
  payments:                 [['payments'], ['ledger', 'suppliers'], ['ledger', 'customers'], ['purchases'], ['sales']],
  products:                 [['products'], ['reports']],
  product_categories:       [['categories']],
  suppliers:                [['suppliers'], ['ledger', 'suppliers']],
  customers:                [['customers'], ['ledger', 'customers']],
  mobile_brands:            [['brands']],
  mobile_models:            [['models']],
}

let channel: ReturnType<typeof supabase.channel> | null = null

export function startRealtime(qc: QueryClient) {
  // Don't start twice
  if (channel) return

  channel = supabase.channel('db-changes')

  Object.keys(TABLE_KEYS).forEach(table => {
    channel!.on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table },
      () => {
        const keys = TABLE_KEYS[table] ?? []
        keys.forEach(key => {
          void qc.invalidateQueries({ queryKey: key })
        })
      }
    )
  })

  channel.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] Connected — listening to all tables')
    }
  })
}

export function stopRealtime() {
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}
