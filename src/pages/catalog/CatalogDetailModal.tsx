// src/pages/catalog/CatalogDetailModal.tsx
import { X, Share2, MessageCircle, Phone, Plus, Check, Smartphone, Package, Wrench } from 'lucide-react'
import { fmt } from '@/lib/fmt'
import { whatsappUrl } from '@/lib/whatsapp'
import { catalogService, type CatalogEntry } from '@/services/catalog.service'
import type { StoreInfo } from '@/types/database'

const ICON = { device: Smartphone, accessory: Package, spare_part: Wrench } as const

interface Props {
  entry:     CatalogEntry
  inCartQty: number
  store:     StoreInfo | null
  onAdd:     () => void
  onClose:   () => void
}

function pageUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}catalog`
}

export function CatalogDetailModal({ entry, inCartQty, store, onAdd, onClose }: Props) {
  const Icon       = ICON[entry.group]
  const soldOut    = entry.maxQty < 1
  const reachedMax = inCartQty >= entry.maxQty
  const text       = catalogService.shareText(entry, pageUrl())

  async function share() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: entry.title, text }); return } catch { return }
    }
    window.open(whatsappUrl('', text), '_blank', 'noreferrer')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div dir="rtl" className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="relative h-64 bg-slate-50 dark:bg-gray-800 flex items-center justify-center rounded-t-3xl">
          {entry.image
            ? <img src={entry.image} alt={entry.title} className="max-h-full max-w-full object-contain p-5" />
            : <Icon size={72} strokeWidth={1.2} className="text-slate-400" />}
          <button onClick={onClose} aria-label="إغلاق"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{entry.subtitle}</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{entry.title}</h2>
          </div>

          {entry.specs.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-gray-800 divide-y divide-slate-100 dark:divide-gray-800">
              {entry.specs.map(sp => (
                <div key={sp.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-500 dark:text-gray-400">{sp.label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{sp.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
              {fmt(entry.price)} <span className="text-base font-medium text-slate-500">ج</span>
            </p>
            <p className={soldOut ? 'text-sm text-red-600' : 'text-sm text-emerald-600 dark:text-emerald-400'}>
              {soldOut ? 'نفد' : entry.kind === 'device' ? `متاح ${entry.maxQty} قطع` : 'متوفر'}
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={onAdd} disabled={soldOut || reachedMax}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2">
              {soldOut ? 'غير متاح' : inCartQty > 0 ? <><Check size={16} /> في السلة ({inCartQty})</> : <><Plus size={16} /> أضف للسلة</>}
            </button>
            <button onClick={() => void share()} aria-label="مشاركة"
              className="w-12 h-12 rounded-xl border border-slate-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300">
              <Share2 size={18} />
            </button>
          </div>

          {(store?.whatsapp || store?.phone) && (
            <div className="flex gap-2">
              {store.phone && (
                <a href={`tel:${store.phone}`}
                  className="flex-1 h-11 rounded-xl border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center justify-center gap-2">
                  <Phone size={16} /> اتصال
                </a>
              )}
              {store.whatsapp && (
                <a href={whatsappUrl(store.whatsapp, `مرحبًا، عايز أستفسر عن ${entry.title}`)} target="_blank" rel="noreferrer"
                  className="flex-1 h-11 rounded-xl border border-green-500 text-green-600 dark:text-green-400 text-sm font-semibold flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> واتساب
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
