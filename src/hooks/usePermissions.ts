// src/hooks/usePermissions.ts

import { useAuth } from '@/lib/auth'
import { can, PERMISSIONS } from '@/lib/permissions'
import type { Action, Resource, PermissionMatrix } from '@/lib/permissions'

export function usePermissions() {
  const { profile } = useAuth()
  const role = profile?.role ?? null

  return {
    role,
    can: (action: Action, resource: Resource) => can(role, action, resource),
    canView:   (resource: Resource) => can(role, 'view',   resource),
    canCreate: (resource: Resource) => can(role, 'create', resource),
    canEdit:   (resource: Resource) => can(role, 'edit',   resource),
    canDelete: (resource: Resource) => can(role, 'delete', resource),
    matrix: PERMISSIONS,
  }
}
