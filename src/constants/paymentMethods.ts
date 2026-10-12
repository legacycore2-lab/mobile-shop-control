// src/constants/paymentMethods.ts
import type { CashMethod } from '@/types/dailyClose'

export const CASH_METHOD_ORDER: CashMethod[] = ['cash', 'bank_transfer', 'check', 'other']

export const CASH_METHOD_LABELS: Record<CashMethod, string> = {
  cash:          'نقدي',
  bank_transfer: 'تحويل بنكي',
  check:         'شيك',
  other:         'أخرى',
}

export function toCashMethod(value: string | null | undefined): CashMethod {
  return value === 'cash' || value === 'bank_transfer' || value === 'check' ? value : 'other'
}
