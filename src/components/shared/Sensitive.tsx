// src/components/shared/Sensitive.tsx
// يخفي الرقم الحساس لو الدور الحالي ملوش صلاحية عرضه
import type { ReactNode } from 'react'
import { useNumberVisibility } from '@/hooks/usePermissions'
import type { NumberKind } from '@/lib/permissions'

interface Props {
  kind:      NumberKind
  children:  ReactNode
  fallback?: ReactNode
}

export function Sensitive({ kind, children, fallback = '•••' }: Props) {
  const visible = useNumberVisibility()
  return <>{visible[kind] ? children : fallback}</>
}
