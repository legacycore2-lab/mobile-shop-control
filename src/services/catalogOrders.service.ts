// src/services/catalogOrders.service.ts
import { catalogOrdersRepository, type CatalogOrderWithItems } from '@/repositories/catalogOrders.repository'
import type { CatalogOrderStatus } from '@/types/database'

export type { CatalogOrderWithItems }

export const catalogOrdersService = {
  getAll:       (): Promise<CatalogOrderWithItems[]> => catalogOrdersRepository.getAll(),
  countNew:     (): Promise<number>                  => catalogOrdersRepository.countNew(),
  updateStatus: (id: string, status: CatalogOrderStatus, userId: string): Promise<void> =>
    catalogOrdersRepository.updateStatus(id, status, userId),
}
