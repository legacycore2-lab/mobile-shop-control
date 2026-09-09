// src/repositories/permissions.repository.ts
// @ts-nocheck — Supabase v2 cannot infer types for post-init tables; fix = generate types via supabase gen types
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'
import type { RolePermission, Resource, Action } from '@/lib/permissions'

export async function fetchAllPermissions(): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role')
    .order('resource')
  if (error) throw error
  return data ?? []
}

export async function fetchPermissionsForRole(role: UserRole): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role)
  if (error) throw error
  return data ?? []
}

export async function upsertPermission(
  role: UserRole,
  resource: Resource,
  action: Action,
  value: boolean
): Promise<void> {
  const col = `can_${action}` as const

  // get existing row
  const { data: existing } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role)
    .eq('resource', resource)
    .single()

  if (existing) {
    const update: Record<string, boolean> = { [col]: value }
    // rule: disable view → disable all
    if (action === 'view' && !value) {
      update.can_create = false
      update.can_edit   = false
      update.can_delete = false
    }
    // rule: enable create/edit/delete → enable view
    if (action !== 'view' && value) {
      update.can_view = true
    }
    await supabase.from('role_permissions').update(update).eq('id', existing.id)
  } else {
    const row = {
      role, resource,
      can_view:   action === 'view'   ? value : false,
      can_create: action === 'create' ? value : false,
      can_edit:   action === 'edit'   ? value : false,
      can_delete: action === 'delete' ? value : false,
    }
    if (action !== 'view' && value) row.can_view = true
    await supabase.from('role_permissions').insert(row)
  }
}

export async function upsertRolePermissions(
  role: UserRole,
  permissions: RolePermission[]
): Promise<void> {
  const rows = permissions.map(p => ({
    role:       p.role,
    resource:   p.resource,
    can_view:   p.can_view,
    can_create: p.can_create,
    can_edit:   p.can_edit,
    can_delete: p.can_delete,
  }))
  const { error } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role,resource' })
  if (error) throw error
}

export async function saveAllPermissions(rows: RolePermission[]): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .upsert(
      rows.map(r => ({
        role:       r.role,
        resource:   r.resource,
        can_view:   r.can_view,
        can_create: r.can_create,
        can_edit:   r.can_edit,
        can_delete: r.can_delete,
      })),
      { onConflict: 'role,resource' }
    )
  if (error) throw error
}
