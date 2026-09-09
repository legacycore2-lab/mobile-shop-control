// src/lib/db.ts
// ── Type-safe Supabase helpers ─────────────────────────────────────────────────
// Eliminates `as never` casts by providing properly typed wrappers

import { supabase } from './supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

// Type-safe insert
export async function dbInsert<T extends TableName>(
  table: T,
  data: Tables[T]['Insert'] | Tables[T]['Insert'][]
) {
  return supabase.from(table).insert(data as never)
}

// Type-safe update
export async function dbUpdate<T extends TableName>(
  table: T,
  data: Tables[T]['Update']
) {
  return supabase.from(table).update(data as never)
}

// Type-safe upsert
export async function dbUpsert<T extends TableName>(
  table: T,
  data: Tables[T]['Insert'] | Tables[T]['Insert'][],
  options?: { onConflict?: string }
) {
  return supabase.from(table).upsert(data as never, options)
}

// Type-safe select with return type
export async function dbSelect<T extends TableName>(
  table: T,
  query: ReturnType<typeof supabase.from>
): Promise<Tables[T]['Row'][]> {
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Tables[T]['Row'][]
}
