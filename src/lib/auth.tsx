import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from '@/types/database'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
}

const Ctx = createContext<AuthCtx>({ session: null, profile: null, loading: true })

async function loadProfile(uid: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthCtx>({ session: null, profile: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await loadProfile(session.user.id) : null
      setState({ session, profile, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const profile = session ? await loadProfile(session.user.id) : null
      setState({ session, profile, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => { if (error) throw error })

export const signOut = () => supabase.auth.signOut()
