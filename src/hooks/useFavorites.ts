// src/hooks/useFavorites.ts
// المفضلة محفوظة على نفس الجهاز (بدون تسجيل دخول)
import { useState, useCallback } from 'react'
import { readJson, writeJson } from '@/lib/clientStorage'

const KEY = 'catalog:favorites'

export function useFavorites() {
  const [keys, setKeys] = useState<string[]>(() => readJson<string[]>(KEY, []))

  const toggle = useCallback((key: string) => {
    setKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      writeJson(KEY, next)
      return next
    })
  }, [])

  return { keys, toggle, has: (key: string) => keys.includes(key) }
}
