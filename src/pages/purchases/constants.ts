// src/pages/purchases/constants.ts
export { INVOICE_STATUS_MAP as STATUS_MAP, fmt } from '@/constants/statusMaps'
import type { InvoiceStatus } from '@/types/database'
export type FilterStatus = 'all' | InvoiceStatus
export const PAGE_SIZE = 10
