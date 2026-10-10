// src/repositories/pushSubscriptions.repository.ts
import { supabase } from '@/lib/supabase'

export interface PushSubscriptionPayload {
  user_id:  string
  endpoint: string
  p256dh:   string
  auth:     string
}

export const pushSubscriptionsRepository = {

  save: async (payload: PushSubscriptionPayload): Promise<void> => {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(payload as never, { onConflict: 'endpoint' })
    if (error) throw error
  },

  removeByEndpoint: async (endpoint: string): Promise<void> => {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    if (error) throw error
  },
}
