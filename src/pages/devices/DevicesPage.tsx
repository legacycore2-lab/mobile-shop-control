// src/pages/devices/DevicesPage.tsx
import { useState, useMemo } from 'react'
import {
  Search, Plus, Download, Smartphone,
  Package, CheckCircle, Wrench, AlertTriangle,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign,
} from 'lucide-react'
import { useDevices, useDeviceStats, useDeleteDevice } from '@/hooks/useDevices'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { cn } from '@/lib/cn'
import { ImeiLookup }   from './ImeiLookup'
import { DeviceModal }  from './DeviceModal'
import { DeviceDrawer } from './DeviceDrawer'
import { STATUS_MAP, CONDITION_MAP, PAGE_SIZE, type FilterStatus } from './constants'
import type { MobileDeviceView } from '@/types/database'

export function DevicesPage() {
  const { data: devices = [], isLoading } = useDevices()
  const { data: stats }                   = useDeviceStats()
  const deleteMutation                    = useDeleteDevice()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<FilterStatus>('all')
  const [page,     setPage]     = useState(1)
  const [modal,    setModal]    = useState<'add' | 'edit' | null>(null)
  const [selected, setSelected] = useState<MobileDeviceView | null>(null)
  const [drawer,   setDrawer]   = useState<MobileDeviceView | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return devices.filter(d => {
      const matchSearch = !q ||
        d.imei1.toLowerCase().includes(q) ||
        (d.imei2 ?? '').toLowerCase().includes(q) ||
        d.brand_name.toLowerCase().includes(q) ||
        d.model_name.toLowerCase().includes(q) ||
        (d.color ?? '').toLowerCase().includes(q) ||
        (d.serial_number ?? '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || d.status === filter
      return matchSearch && matchFilter
    })
  }, [devices, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openEdit(d: MobileDeviceView) { setSelected(d); setModal('edit') }
  function closeModal() { setModal(null); setSelected(null) }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return
    await deleteMutation.mutateAsync(id)
  }

  const STATS_CONFIG = [
    { label: 'في المخزون',  value: stats?.inStock  ?? 0, icon: Package,       colorClass: 'text-blue-600 dark:text-blue-400',   bgClass: 'bg-blue-50 dark:bg-blue-900/20'   },
    { label: 'مباع',        value: stats?.sold     ?? 0, icon: CheckCircle,   colorClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'في الصيانة', value: stats?.repair   ?? 0, icon: Wrench,        colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'تالف / مُعاد', value: (stats?.defective ?? 0) + (stats?.returned ?? 0), icon: AlertTriangle, colorClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-900/20' },
    {
      label: 'قيمة المخزون (شراء)',
      value: `${(stats?.totalCostValue ?? 0).toLocaleString('ar-EG')} ج`,
      sub: `بيع: ${(stats?.totalSellingValue ?? 0).toLocaleString('ar-EG')} ج`,
      icon: DollarSign,
      colorClass: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    },
    { label: 'إجمالي الأجهزة', value: stats?.total ?? 0, icon: TrendingUp, colorClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-800' },
  ]

  const FILTER_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',           label: 'الكل'         },
    { value: 'in_stock',      label: 'المخزون'      },
    { value: 'sold',          label: 'مباع'         },
    { value: 'sent_to_repair',label: 'الصيانة'      },
    { value: 'defective',     label: 'تالف'         },
    { value: 'returned',      label: 'مُعاد'        },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">الأجهزة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إدارة مخزون الأجهزة وتتبع IMEI</p>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Download size={14} /> تصدير
          </button>
          <button onClick={() => setModal('add')}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
            <Plus size={14} /> جهاز جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS_CONFIG.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* IMEI Lookup */}
      <ImeiLookup />

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بـ IMEI، الماركة، الموديل..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(({ value, label }) => (
            <button key={value} onClick={() => { setFilter(value); setPage(1) }}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap',
                filter === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['#', 'الجهاز', 'IMEI', 'المواصفات', 'المورد', 'سعر الشراء', 'سعر البيع', 'الحالة', 'إجراءات'].map((h, i) => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-right',
                    i >= 5 && 'text-center',
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-400 dark:text-gray-600">
                    <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
                    <p>لا توجد أجهزة</p>
                  </td>
                </tr>
              ) : paginated.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-600 font-mono">
                    {String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {d.brand_name} {d.model_name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                      {CONDITION_MAP[d.condition] ?? d.condition}
                      {d.location && ` · ${d.location}`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{d.imei1}</p>
                    {d.imei2 && <p className="font-mono text-xs text-gray-400 dark:text-gray-600 mt-0.5">{d.imei2}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {d.storage && <span className="text-xs text-gray-600 dark:text-gray-400">{d.storage}</span>}
                      {d.color   && <span className="text-xs text-gray-400 dark:text-gray-600">{d.color}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {d.supplier_name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {d.cost_price.toLocaleString('ar-EG')} ج
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.selling_price ? (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                        {d.selling_price.toLocaleString('ar-EG')} ج
                      </span>
                    ) : <span className="text-xs text-gray-400 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_MAP[d.status].variant} dot>
                      {STATUS_MAP[d.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button title="عرض التفاصيل" onClick={() => setDrawer(d)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Eye size={13} />
                      </button>
                      <button title="تعديل" onClick={() => openEdit(d)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button title="حذف" onClick={() => void handleDelete(d.id)}
                        disabled={deleteMutation.isPending}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> من{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{devices.length}</span> جهاز
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <DeviceModal
          device={modal === 'edit' ? selected : null}
          onClose={closeModal}
        />
      )}
      {drawer && (
        <DeviceDrawer device={drawer} onClose={() => setDrawer(null)} />
      )}
    </div>
  )
}

