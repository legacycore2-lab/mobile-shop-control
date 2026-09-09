// src/lib/audit.ts
import { supabase } from '@/lib/supabase'

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'confirm' | 'cancel' | 'pay'
  | 'sell' | 'buy' | 'login' | 'logout'

interface LogOptions {
  userId:       string
  action:       AuditAction
  table:        string
  recordId?:    string
  description?: string
  oldData?:     Record<string, unknown>
  newData?:     Record<string, unknown>
}

export async function logAction(opts: LogOptions): Promise<void> {
  try {
    await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
    }).rpc('log_action_v2', {
      p_user_id:    opts.userId,
      p_action:     opts.action,
      p_table:      opts.table      ?? null,
      p_record_id:  opts.recordId   ?? null,
      p_description:opts.description ?? null,
      p_old_data:   opts.oldData    ?? null,
      p_new_data:   opts.newData    ?? null,
    })
  } catch {
    // silent
  }
}
