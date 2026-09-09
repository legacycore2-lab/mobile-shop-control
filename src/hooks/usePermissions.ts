// src/hooks/usePermissions.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import {
  fetchAllPermissions,
  fetchPermissionsForRole,
  saveAllPermissions,
} from '@/repositories/permissions.repository'
import { can as canFn, RESOURCES, ACTIONS } from '@/lib/permissions'
import type { Resource, Action, PermissionMap, RolePermission } from '@/lib/permissions'
import type { UserRole } from '@/types/database'

const KEYS = {
  all:     ['permissions', 'all']          as const,
  role:    (r: UserRole) => ['permissions', r] as const,
}

// ── build PermissionMap from DB rows ─────────────────────────────
function buildMap(rows: RolePermission[]): PermissionMap {
  const map = new Map<Resource, Record<Action, boolean>>()
  for (const r of rows) {
    map.set(r.resource as Resource, {
      view:   r.can_view,
      create: r.can_create,
      edit:   r.can_edit,
      delete: r.can_delete,
    })
  }
  return map
}

// ── hook for current user ─────────────────────────────────────────
export function usePermissions() {
  const { profile } = useAuth()
  const role = profile?.role ?? null

  const { data: rows = [] } = useQuery({
    queryKey:  KEYS.role(role as UserRole),
    queryFn:   () => role ? fetchPermissionsForRole(role as UserRole) : Promise.resolve([]),
    enabled:   !!role,
    staleTime: 1000 * 60 * 5,  // 5 دقايق cache
  })

  const map = buildMap(rows)

  return {
    role,
    map,
    can:       (action: Action, resource: Resource) => canFn(map, action, resource),
    canView:   (resource: Resource) => canFn(map, 'view',   resource),
    canCreate: (resource: Resource) => canFn(map, 'create', resource),
    canEdit:   (resource: Resource) => canFn(map, 'edit',   resource),
    canDelete: (resource: Resource) => canFn(map, 'delete', resource),
    isReady:   rows.length > 0,
  }
}

// ── hook for admin page (all roles) ──────────────────────────────
export function useAllPermissions() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  fetchAllPermissions,
    staleTime: 0,
  })
}

export function useSavePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: RolePermission[]) => saveAllPermissions(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
  })
}
