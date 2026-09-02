// src/pages/devices/constants.ts
// Re-exports from shared constants + device-specific extras

export {
  DEVICE_STATUS_MAP as STATUS_MAP,
  CONDITION_MAP,
  fmt,
} from '@/constants/statusMaps'

import type { DeviceStatus } from '@/types/database'

export type FilterStatus = 'all' | DeviceStatus

export const PAGE_SIZE = 10
