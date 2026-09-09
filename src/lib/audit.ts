// src/lib/audit.ts
// مساعد مركزي لتسجيل العمليات في audit_logs عبر Supabase RPC

import { supabase } from '@/lib/supabase'

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'confirm' | 'cancel' | 'pay'
  | 'sell' | 'buy' | 'login' | 'logout'

interface LogOptions {
  userId:    string
  action:    AuditAction
  table:     string
  recordId?: string
  oldData?:  Record<string, unknown>
  newData?:  Record<string, unknown>
}

/**
 * يسجل عملية في audit_logs عبر log_action RPC
 * لا يرمي error لو فشل — logging لا يوقف العملية الأصلية
 */
export async function logAction(opts: LogOptions): Promise<void> {
  try {
    await supabase.rpc('log_action', {
      p_user_id:   opts.userId,
      p_action:    opts.action,
      p_table:     opts.table,
      p_record_id: opts.recordId ?? null,
      p_old_data:  opts.oldData  ? (opts.oldData  as never) : null,
      p_new_data:  opts.newData  ? (opts.newData  as never) : null,
    } as never)
  } catch {
    // silent — audit failure never blocks the main operation
  }
}
