import { useState, useMemo, useEffect } from 'react'
import {
  Search, Plus, Download, Smartphone, Package,
  CheckCircle, Wrench, AlertTriangle, RotateCcw,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  X, ScanLine, TrendingUp, DollarSign,
} from 'lucide-react'
import {
  useDevices, useDeviceStats,
  useCreateDevice, useUpdateDevice, useDeleteDevice,
  useBrands, useModelsByBrand, useCreateBrand, useCreateModel,
} from '@/hooks/useDevices'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useAuth } from '@/lib/auth'
import { devicesService } from '@/services/devices.service'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { MobileDeviceView, DeviceStatus } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | DeviceStatus

const STATUS_MAP: Record<DeviceStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }> = {
  in_stock:       { label: 'في المخزون',    variant: 'success' },
  sold:           { label: 'مباع',          variant: 'info'    },
  returned:       { label: 'مُعاد',         variant: 'warning' },
  defective:      { label: 'تالف',          variant: 'danger'  },
  sent_to_repair: { label: 'في الصيانة',   variant: 'warning' },
}

const CONDITION_MAP: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

const PAGE_SIZE = 10

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass, bgClass, sub }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; colorClass: string; bgClass: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bgClass)}>
        <Icon size={18} className={colorClass} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── IMEI Lookup Panel ─────────────────────────────────────────────────────────

function ImeiLookup() {
  const [imei, setImei]     = useState('')
  const [result, setResult] = useState<{ found: boolean; device: MobileDeviceView | null } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!imei.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await devicesService.lookupByImei(imei)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ScanLine size={16} className="text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">بحث بـ IMEI</span>
      </div>
      <div className="flex gap-2">
        <input
          value={imei}
          onChange={e => setImei(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSearch()}
          placeholder="أدخل رقم IMEI للبحث..."
          dir="ltr"
          className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
        />
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !imei.trim()}
          className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Search size={14} />}
          بحث
        </button>
        {(imei || result) && (
          <button onClick={() => { setImei(''); setResult(null) }}
            className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {result && (
        <div className={cn(
          'mt-3 rounded-lg border p-3',
          result.found
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        )}>
          {result.found && result.device ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {result.device.brand_name} {result.device.model_name}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">IMEI: {result.device.imei1}</span>
                  {result.device.color    && <span className="text-xs text-gray-500 dark:text-gray-400">اللون: {result.device.color}</span>}
                  {result.device.storage  && <span className="text-xs text-gray-500 dark:text-gray-400">السعة: {result.device.storage}</span>}
                  <span className="text-xs text-gray-500 dark:text-gray-400">المورد: {result.device.supplier_name}</span>
                </div>
              </div>
              <Badge variant={STATUS_MAP[result.device.status].variant} dot>
                {STATUS_MAP[result.device.status].label}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              لم يتم العثور على جهاز بهذا الـ IMEI
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Device Form ───────────────────────────────────────────────────────────────

interface FormState {
  imei1: string; imei2: string; serial_number: string
  brand_id: string; model_id: string
  storage: string; color: string; condition: string
  supplier_id: string; purchase_date: string
  cost_price: string; selling_price: string
  warranty_months: string; location: string; notes: string
}

const EMPTY_FORM: FormState = {
  imei1: '', imei2: '', serial_number: '',
  brand_id: '', model_id: '',
  storage: '', color: '', condition: 'new',
  supplier_id: '', purchase_date: new Date().toISOString().split('T')[0],
  cost_price: '', selling_price: '',
  warranty_months: '12', location: '', notes: '',
}

function DeviceModal({ device, onClose }: {
  device: MobileDeviceView | null
  onClose: () => void
}) {
  const { profile }     = useAuth()
  const { data: brands  = [] } = useBrands()
  const { data: suppliers = [] } = useSuppliers()

  const createMutation     = useCreateDevice()
  const updateMutation     = useUpdateDevice()
  const createBrandMutation = useCreateBrand()
  const createModelMutation = useCreateModel()

  const [form, setForm] = useState<FormState>(
    device
      ? {
          imei1:           device.imei1,
          imei2:           device.imei2           ?? '',
          serial_number:   device.serial_number   ?? '',
          brand_id:        '',  // filled via useEffect
          model_id:        device.model_id,
          storage:         device.storage         ?? '',
          color:           device.color           ?? '',
          condition:       device.condition,
          supplier_id:     device.supplier_id,
          purchase_date:   device.purchase_date,
          cost_price:      String(device.cost_price),
          selling_price:   String(device.selling_price ?? ''),
          warranty_months: String(device.warranty_months),
          location:        device.location        ?? '',
          notes:           device.notes           ?? '',
        }
      : EMPTY_FORM
  )

  const [newBrandName, setNewBrandName] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [showNewModel, setShowNewModel] = useState(false)
  const [error, setError]               = useState('')

  // Auto-fill brand from model when editing
  const { data: allModels = [] } = useModelsByBrand(form.brand_id)

  useEffect(() => {
    if (device && brands.length > 0) {
      // find brand_id by looking up the model in all brands' models
      // We stored brand_name in the view, match it
      const matchedBrand = brands.find(b => b.name === device.brand_name)
      if (matchedBrand) setForm(f => ({ ...f, brand_id: matchedBrand.id }))
    }
  }, [device, brands])

  const set = (k: keyof FormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'brand_id') setForm(f => ({ ...f, brand_id: v, model_id: '' }))
  }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return
    try {
      const brand = await createBrandMutation.mutateAsync(newBrandName.trim())
      setForm(f => ({ ...f, brand_id: brand.id, model_id: '' }))
      setNewBrandName('')
      setShowNewBrand(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ في إضافة الماركة')
    }
  }

  async function handleAddModel() {
    if (!form.brand_id || !newModelName.trim()) return
    try {
      const model = await createModelMutation.mutateAsync({ brandId: form.brand_id, name: newModelName.trim() })
      setForm(f => ({ ...f, model_id: model.id }))
      setNewModelName('')
      setShowNewModel(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ في إضافة الموديل')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (device) {
        await updateMutation.mutateAsync({
          id: device.id,
          form: {
            ...form,
            cost_price:      Number(form.cost_price),
            selling_price:   Number(form.selling_price) || 0,
            warranty_months: Number(form.warranty_months) || 0,
          },
        })
      } else {
        await createMutation.mutateAsync({
          ...form,
          cost_price:      Number(form.cost_price),
          selling_price:   Number(form.selling_price) || 0,
          warranty_months: Number(form.warranty_months) || 0,
          added_by:        profile?.id ?? '',
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'
  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const selectCls = inputCls + ' cursor-pointer'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {device ? 'تعديل جهاز' : 'إضافة جهاز جديد'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {device ? `تعديل بيانات ${device.brand_name} ${device.model_name}` : 'أدخل بيانات الجهاز الجديد'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

            {/* Section: IMEI */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات التعريف</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>IMEI 1 <span className="text-red-500">*</span></label>
                  <input value={form.imei1} onChange={e => set('imei1', e.target.value)}
                    placeholder="355XXXXXXXXXXXX" dir="ltr" required
                    className={cn(inputCls, 'font-mono')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>IMEI 2</label>
                  <input value={form.imei2} onChange={e => set('imei2', e.target.value)}
                    placeholder="355XXXXXXXXXXXX" dir="ltr"
                    className={cn(inputCls, 'font-mono')} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>الرقم التسلسلي</label>
                  <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
                    placeholder="SN..." dir="ltr"
                    className={cn(inputCls, 'font-mono')} />
                </div>
              </div>
            </div>

            {/* Section: Brand & Model */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">الماركة والموديل</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الماركة <span className="text-red-500">*</span></label>
                  {showNewBrand ? (
                    <div className="flex gap-2">
                      <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
                        placeholder="اسم الماركة" className={inputCls} autoFocus />
                      <button type="button" onClick={() => void handleAddBrand()}
                        disabled={createBrandMutation.isPending}
                        className="h-10 px-3 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                        حفظ
                      </button>
                      <button type="button" onClick={() => { setShowNewBrand(false); setNewBrandName('') }}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select value={form.brand_id} onChange={e => set('brand_id', e.target.value)}
                        required className={selectCls}>
                        <option value="">اختر الماركة</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowNewBrand(true)}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0"
                        title="إضافة ماركة جديدة">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Model */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الموديل <span className="text-red-500">*</span></label>
                  {showNewModel ? (
                    <div className="flex gap-2">
                      <input value={newModelName} onChange={e => setNewModelName(e.target.value)}
                        placeholder="اسم الموديل" className={inputCls} autoFocus />
                      <button type="button" onClick={() => void handleAddModel()}
                        disabled={createModelMutation.isPending || !form.brand_id}
                        className="h-10 px-3 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                        حفظ
                      </button>
                      <button type="button" onClick={() => { setShowNewModel(false); setNewModelName('') }}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select value={form.model_id} onChange={e => set('model_id', e.target.value)}
                        required disabled={!form.brand_id} className={cn(selectCls, !form.brand_id && 'opacity-50 cursor-not-allowed')}>
                        <option value="">اختر الموديل</option>
                        {allModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowNewModel(true)}
                        disabled={!form.brand_id}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="إضافة موديل جديد">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Specs */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">المواصفات</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>السعة التخزينية</label>
                  <input value={form.storage} onChange={e => set('storage', e.target.value)}
                    placeholder="مثال: 128GB" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>اللون</label>
                  <input value={form.color} onChange={e => set('color', e.target.value)}
                    placeholder="مثال: أسود" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الحالة</label>
                  <select value={form.condition} onChange={e => set('condition', e.target.value)}
                    className={selectCls}>
                    <option value="new">جديد</option>
                    <option value="used">مستعمل</option>
                    <option value="refurbished">مجدد</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Purchase */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات الشراء</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>المورد <span className="text-red-500">*</span></label>
                  <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
                    required className={selectCls}>
                    <option value="">اختر المورد</option>
                    {suppliers.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>تاريخ الشراء <span className="text-red-500">*</span></label>
                  <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
                    required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>سعر الشراء (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" value={form.cost_price}
                    onChange={e => set('cost_price', e.target.value)} placeholder="0.00" required
                    className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>سعر البيع المقترح (ج.م)</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price}
                    onChange={e => set('selling_price', e.target.value)} placeholder="0.00"
                    className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section: Extra */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات إضافية</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>مدة الضمان (شهر)</label>
                  <input type="number" min="0" value={form.warranty_months}
                    onChange={e => set('warranty_months', e.target.value)} placeholder="12"
                    className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الموقع / الرف</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="مثال: رف A2" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>ملاحظات</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="أي ملاحظات إضافية..." rows={2}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none w-full" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {device ? 'حفظ التعديلات' : 'إضافة الجهاز'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Device Detail Drawer ──────────────────────────────────────────────────────

function DeviceDrawer({ device, onClose }: { device: MobileDeviceView; onClose: () => void }) {
  const status = STATUS_MAP[device.status]
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {device.brand_name} {device.model_name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{device.imei1}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">الحالة</span>
            <Badge variant={status.variant} dot>{status.label}</Badge>
          </div>

          {/* Specs */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">المواصفات</p>
            {[
              ['IMEI 1', device.imei1, true],
              ['IMEI 2', device.imei2],
              ['الرقم التسلسلي', device.serial_number],
              ['السعة', device.storage],
              ['اللون', device.color],
              ['الحالة', CONDITION_MAP[device.condition] ?? device.condition],
            ].map(([label, value, mono]) =>
              value ? (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={cn('text-xs text-gray-900 dark:text-white font-medium', mono && 'font-mono')}>{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Purchase */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">بيانات الشراء</p>
            {[
              ['المورد', device.supplier_name],
              ['تاريخ الشراء', new Date(device.purchase_date).toLocaleDateString('ar-EG')],
              ['سعر الشراء', `${device.cost_price.toLocaleString('ar-EG')} ج.م`],
              ['سعر البيع', device.selling_price ? `${device.selling_price.toLocaleString('ar-EG')} ج.م` : null],
              ['الضمان', device.warranty_months ? `${device.warranty_months} شهر` : null],
              ['انتهاء الضمان', device.warranty_expires_at
                ? new Date(device.warranty_expires_at).toLocaleDateString('ar-EG')
                : null],
            ].map(([label, value]) =>
              value ? (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-xs text-gray-900 dark:text-white font-medium">{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Sale info */}
          {device.status === 'sold' && device.customer_name && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">بيانات البيع</p>
              {[
                ['العميل', device.customer_name],
                ['تليفون', device.customer_phone],
                ['سعر البيع الفعلي', device.actual_selling_price ? `${device.actual_selling_price.toLocaleString('ar-EG')} ج.م` : null],
                ['تاريخ البيع', device.sold_at ? new Date(device.sold_at).toLocaleDateString('ar-EG') : null],
              ].map(([label, value]) =>
                value ? (
                  <div key={String(label)} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-green-700 dark:text-green-400">{label}</span>
                    <span className="text-xs text-green-900 dark:text-green-200 font-medium">{value}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>أضافه: {device.added_by_name}</p>
            <p>بتاريخ: {new Date(device.created_at).toLocaleDateString('ar-EG')}</p>
            {device.location && <p>الموقع: {device.location}</p>}
            {device.notes    && <p>ملاحظات: {device.notes}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
