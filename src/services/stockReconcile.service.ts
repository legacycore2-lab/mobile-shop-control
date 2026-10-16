// src/services/stockReconcile.service.ts
import { stockReconcileRepository } from '@/repositories/stockReconcile.repository'
import type { ModelCountRow, ModelGroup, ReconcileDevice, ReconcileResult, ScanLookup, ScopeModel } from '@/types/stockReconcile'

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

export function modelKey(d: ReconcileDevice): string {
  return `${d.brand_name}|${d.model_name}`
}

// scope فاضي = كل الموديلات
function inScope(d: ReconcileDevice, scope: Set<string>): boolean {
  return scope.size === 0 || scope.has(modelKey(d))
}

// نوع الجهاز = ماركة + موديل + تخزين + لون
function groupKey(d: ReconcileDevice): string {
  return [d.brand_name, d.model_name, d.storage ?? '', d.color ?? ''].join('|')
}

export const stockReconcileService = {

  getDevices: (): Promise<ReconcileDevice[]> => stockReconcileRepository.getDevices(),

  // نتيجة مسح كود واحد (للتنبيه الفوري وقت المسح)
  lookup: (devices: ReconcileDevice[], code: string): ScanLookup => {
    const device = indexByCode(devices).get(code)
    if (!device) return { kind: 'unknown' }
    return { kind: device.status === 'in_stock' ? 'matched' : 'other_status', device }
  },

  // الموديلات اللي فيها أجهزة في المخزون (لاختيار نطاق المطابقة)
  listModels: (devices: ReconcileDevice[]): ScopeModel[] => {
    const models = new Map<string, ScopeModel>()
    for (const d of devices) {
      if (d.status !== 'in_stock') continue
      const key = modelKey(d)
      const existing = models.get(key)
      if (existing) existing.in_stock++
      else models.set(key, { key, label: `${d.brand_name} ${d.model_name}`, brand_name: d.brand_name, model_name: d.model_name, in_stock: 1 })
    }
    return Array.from(models.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'))
  },

  filterByScope: (devices: ReconcileDevice[], scope: string[]): ReconcileDevice[] => {
    const set = new Set(scope)
    return devices.filter(d => inScope(d, set))
  },

  // الناقص والمطابق بيتحسبوا للموديلات المحددة بس (الأكواد الغريبة بتفضل تظهر)
  reconcile: (devices: ReconcileDevice[], codes: string[], scope: string[] = []): ReconcileResult => {
    const scopeSet      = new Set(scope)
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

    const inStock = devices.filter(d => d.status === 'in_stock' && inScope(d, scopeSet))
    return {
      matched:     inStock.filter(d => matchedIds.has(d.id)).sort(byModel),
      missing:     inStock.filter(d => !matchedIds.has(d.id)).sort(byModel),
      otherStatus: devices.filter(d => otherIds.has(d.id)).sort(byModel),
      unknown,
    }
  },

  // أنواع الأجهزة اللي في المخزون وعددها في النظام
  groupInStock: (devices: ReconcileDevice[]): ModelGroup[] => {
    const groups = new Map<string, ModelGroup>()
    for (const d of devices) {
      if (d.status !== 'in_stock') continue
      const key = groupKey(d)
      const existing = groups.get(key)
      if (existing) { existing.system_qty++; continue }
      groups.set(key, {
        key,
        label: [`${d.brand_name} ${d.model_name}`, d.storage, d.color].filter(Boolean).join(' · '),
        brand_name: d.brand_name, model_name: d.model_name,
        storage: d.storage, color: d.color, system_qty: 1,
      })
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'))
  },

  devicesOfGroup: (devices: ReconcileDevice[], key: string): ReconcileDevice[] =>
    devices.filter(d => d.status === 'in_stock' && groupKey(d) === key).sort(byModel),

  buildCountRows: (groups: ModelGroup[], counts: Record<string, number>): ModelCountRow[] =>
    groups.map(g => {
      const counted = g.key in counts ? counts[g.key] : null
      return { ...g, counted, diff: counted === null ? null : counted - g.system_qty }
    }),
}
