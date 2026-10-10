// src/services/push.service.ts
import { pushSubscriptionsRepository } from '@/repositories/pushSubscriptions.repository'
import {
  pushSupported, getBrowserSubscription, subscribeBrowser, unsubscribeBrowser,
} from '@/lib/push'

export const pushService = {

  supported: (): boolean => pushSupported(),

  isSubscribed: async (): Promise<boolean> => (await getBrowserSubscription()) !== null,

  enable: async (userId: string): Promise<void> => {
    const json = (await subscribeBrowser()).toJSON()
    const p256dh = json.keys?.['p256dh']
    const auth   = json.keys?.['auth']
    if (!json.endpoint || !p256dh || !auth) throw new Error('بيانات الاشتراك غير مكتملة')
    await pushSubscriptionsRepository.save({ user_id: userId, endpoint: json.endpoint, p256dh, auth })
  },

  disable: async (): Promise<void> => {
    const endpoint = await unsubscribeBrowser()
    if (endpoint) await pushSubscriptionsRepository.removeByEndpoint(endpoint)
  },
}
