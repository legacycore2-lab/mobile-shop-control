import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'
import type { Profile } from '@/types/database'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  demoMode: boolean
}

const Ctx = createContext<AuthCtx>({ session: null, profile: null, loading: true, demoMode: false })

const DEMO_PROFILE: Profile = {
  id: 'demo',
  full_name: 'محمود — وضع العرض',
  phone: null,
  role: 'owner',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

async function loadProfile(uid: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthCtx>({ session: null, profile: null, loading: true, demoMode: false })

  useEffect(() => {
    // لو مفيش Supabase — وضع العرض مباشرة
    if (!isConfigured) {
      const demo = localStorage.getItem('demo_mode') === 'true'
      setState({ session: null, profile: demo ? DEMO_PROFILE : null, loading: false, demoMode: demo })
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await loadProfile(session.user.id) : null
      setState({ session, profile, loading: false, demoMode: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const profile = session ? await loadProfile(session.user.id) : null
      setState({ session, profile, loading: false, demoMode: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

export function enterDemoMode() {
  localStorage.setItem('demo_mode', 'true')
  window.location.reload()
}

export function exitDemoMode() {
  localStorage.removeItem('demo_mode')
  window.location.reload()
}

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => { if (error) throw error })

export const signOut = () => {
  if (!isConfigured) { exitDemoMode(); return Promise.resolve() }
  return supabase.auth.signOut()
}
