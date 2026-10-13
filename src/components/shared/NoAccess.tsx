// src/components/shared/NoAccess.tsx
import { Lock } from 'lucide-react'

export function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
      <Lock size={32} className="mb-3 opacity-40" />
      <p className="text-sm font-semibold">ليس لديك صلاحية عرض هذه الصفحة</p>
    </div>
  )
}
