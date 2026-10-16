// src/services/stockReconcile.service.ts
import { stockReconcileRepository } from '@/repositories/stockReconcile.repository'
import type { ReconcileDevice, ReconcileResult, ScanLookup } from '@/types/stockReconcile'

// بعض سكانرات USB بتضيف بادئة زي 02/ قبل الكود
export function normalizeCode(raw: string): string {
  return raw.replace(/^0\d\//, '').trim()
}

// نص ملصوق (كود في كل سطر، أو مفصول بمسافة/فاصلة) → أكواد نظيفة من غير تكرار
export function parseCodes(text: string): string[] {
  const codes = text.split(/[\s,;]+/).map(normalizeCode).filter(Boolean)
  return Array.from(new Set(codes))
}

function indexByCode(devices: ReconcileDevice[]): Map<string, ReconcileDevice> {
  const index = new Map<string, ReconcileDevice>()
  for (const d of devices) {
    index.set(d.imei1, d)
    if (d.imei2) index.set(d.imei2, d)
  }
  return index
}

const byModel = (a: ReconcileDevice, b: ReconcileDevice): number =>
  a.brand_name.localeCompare(b.brand_name, 'ar') ||
  a.model_name.localeCompare(b.model_name, 'ar') ||
  a.imei1.localeCompare(b.imei1)

export const stockReconcileService = {

  getDevices: (): Promise<ReconcileDevice[]> => stockReconcileRepository.getDevices(),

  // نتيجة مسح كود واحد (للتنبيه الفوري وقت المسح)
  lookup: (devices: ReconcileDevice[], code: string): ScanLookup => {
    const device = indexByCode(devices).get(code)
    if (!device) return { kind: 'unknown' }
    return { kind: device.status === 'in_stock' ? 'matched' : 'other_status', device }
  },

  reconcile: (devices: ReconcileDevice[], codes: string[]): ReconcileResult => {
    const index        = indexByCode(devices)
    const matchedIds   = new Set<string>()
    const otherIds     = new Set<string>()
    const unknown: string[] = []

    for (const code of codes) {
      const device = index.get(code)
      if (!device)                         unknown.push(code)
      else if (device.status === 'in_stock') matchedIds.add(device.id)
      else                                 otherIds.add(device.id)
    }

    const inStock = devices.filter(d => d.status === 'in_stock')
    return {
      matched:     inStock.filter(d => matchedIds.has(d.id)).sort(byModel),
      missing:     inStock.filter(d => !matchedIds.has(d.id)).sort(byModel),
      otherStatus: devices.filter(d => otherIds.has(d.id)).sort(byModel),
      unknown,
    }
  },
}
