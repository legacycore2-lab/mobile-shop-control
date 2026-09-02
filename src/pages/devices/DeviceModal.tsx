// src/pages/devices/DeviceModal.tsx
import { useState, useEffect } from 'react'
import { Plus, X, ScanLine } from 'lucide-react'
import { BarcodeScanner } from '@/components/shared/BarcodeScanner'
import { BarcodeLabelModal } from '@/components/shared/BarcodeLabelModal'
import {
  useCreateDevice, useUpdateDevice,
  useBrands, useModelsByBrand, useCreateBrand, useCreateModel,
} from '@/hooks/useDevices'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { MobileDeviceView } from '@/types/database'

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

export function DeviceModal({ device, onClose, initImei = '' }: {
  device:    MobileDeviceView | null
  onClose:   () => void
  initImei?: string
}) {
  const { profile }      = useAuth()
  const { data: brands     = [] } = useBrands()
  const { data: suppliers  = [] } = useSuppliers()

  const createMutation      = useCreateDevice()
  const updateMutation      = useUpdateDevice()
  const createBrandMutation = useCreateBrand()
  const createModelMutation = useCreateModel()

  const [form, setForm] = useState<FormState>(
    device
      ? {
          imei1:           device.imei1,
          imei2:           device.imei2           ?? '',
          serial_number:   device.serial_number   ?? '',
          brand_id:        '',
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
      : { ...EMPTY_FORM, imei1: initImei }
  )

  useEffect(() => {
    if (initImei && !device) setForm(f => ({ ...f, imei1: initImei }))
  }, [initImei, device])

  const [newBrandName, setNewBrandName] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [showNewModel, setShowNewModel] = useState(false)
  const [error,        setError]        = useState('')
  const [scanImei1,    setScanImei1]    = useState(false)
  const [scanImei2,    setScanImei2]    = useState(false)

  // After save — show label
  const [printLabel, setPrintLabel] = useState<{
    imei: string; name: string; extra: string; price: number
  } | null>(null)

  const { data: allModels = [] } = useModelsByBrand(form.brand_id)

  useEffect(() => {
    if (device && brands.length > 0) {
      const matchedBrand = brands.find(b => b.name === device.brand_name)
      if (matchedBrand) setForm(f => ({ ...f, brand_id: matchedBrand.id }))
    }
  }, [device, brands])

  const set = (k: keyof FormState, v: string) => {
    if (k === 'brand_id') {
      setForm(f => ({ ...f, brand_id: v, model_id: '' }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
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
        onClose()
      } else {
        await createMutation.mutateAsync({
          ...form,
          cost_price:      Number(form.cost_price),
          selling_price:   Number(form.selling_price) || 0,
          warranty_months: Number(form.warranty_months) || 0,
          added_by:        profile?.id ?? '',
        })
        // Find brand & model names for label
        const brand = brands.find(b => b.id === form.brand_id)
        const model = allModels.find(m => m.id === form.model_id)
        const extras = [form.storage, form.color].filter(Boolean).join(' · ')
        setPrintLabel({
          imei:  form.imei1,
          name:  `${brand?.name ?? ''} ${model?.name ?? ''}`.trim(),
          extra: extras,
          price: Number(form.selling_price) || 0,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  const labelCls  = 'text-sm font-semibold text-gray-700 dark:text-gray-300'
  const inputCls  = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const selectCls = inputCls + ' cursor-pointer'

  // Show label after save
  if (printLabel) {
    return (
      <BarcodeLabelModal
        label={{
          type:    'device',
          code:    printLabel.imei,
          name:    printLabel.name,
          extra:   printLabel.extra || undefined,
          price:   printLabel.price,
        }}
        onClose={onClose}
      />
    )
  }

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

            {/* IMEI */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات التعريف</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>IMEI 1 <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input value={form.imei1} onChange={e => set('imei1', e.target.value)}
                      placeholder="355XXXXXXXXXXXX" dir="ltr" required
                      className={cn(inputCls, 'font-mono')} />
                    <button type="button" onClick={() => setScanImei1(true)}
                      className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0">
                      <ScanLine size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>IMEI 2</label>
                  <div className="flex gap-2">
                    <input value={form.imei2} onChange={e => set('imei2', e.target.value)}
                      placeholder="355XXXXXXXXXXXX" dir="ltr"
                      className={cn(inputCls, 'font-mono')} />
                    <button type="button" onClick={() => setScanImei2(true)}
                      className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0">
                      <ScanLine size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>الرقم التسلسلي</label>
                  <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
                    placeholder="SN..." dir="ltr" className={cn(inputCls, 'font-mono')} />
                </div>
              </div>
            </div>

            {/* Brand & Model */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">الماركة والموديل</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

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
                        required disabled={!form.brand_id}
                        className={cn(selectCls, !form.brand_id && 'opacity-50 cursor-not-allowed')}>
                        <option value="">اختر الموديل</option>
                        {allModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowNewModel(true)}
                        disabled={!form.brand_id}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Specs */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">المواصفات</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>السعة التخزينية</label>
                  <input value={form.storage} onChange={e => set('storage', e.target.value)}
                    placeholder="128GB" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>اللون</label>
                  <input value={form.color} onChange={e => set('color', e.target.value)}
                    placeholder="أسود" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الحالة</label>
                  <select value={form.condition} onChange={e => set('condition', e.target.value)} className={selectCls}>
                    <option value="new">جديد</option>
                    <option value="used">مستعمل</option>
                    <option value="refurbished">مجدد</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Purchase */}
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
                    onChange={e => set('cost_price', e.target.value)} placeholder="0.00" required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>سعر البيع المقترح (ج.م)</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price}
                    onChange={e => set('selling_price', e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Extra */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات إضافية</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>مدة الضمان (شهر)</label>
                  <input type="number" min="0" value={form.warranty_months}
                    onChange={e => set('warranty_months', e.target.value)} placeholder="12" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الموقع / الرف</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="رف A2" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>ملاحظات</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="أي ملاحظات إضافية..." rows={2}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none w-full" />
                </div>
              </div>
            </div>

            {!device && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <span className="text-xs text-green-700 dark:text-green-400">
                  بعد الحفظ سيظهر باركود الـ IMEI جاهزاً للطباعة تلقائياً
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {scanImei1 && (
            <BarcodeScanner title="مسح IMEI 1" placeholder="355XXXXXXXXXXXX" validate={/^\d{14,16}$/}
              onScan={code => { set('imei1', code); setScanImei1(false) }}
              onClose={() => setScanImei1(false)} />
          )}
          {scanImei2 && (
            <BarcodeScanner title="مسح IMEI 2" placeholder="355XXXXXXXXXXXX" validate={/^\d{14,16}$/}
              onScan={code => { set('imei2', code); setScanImei2(false) }}
              onClose={() => setScanImei2(false)} />
          )}

          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {device ? 'حفظ التعديلات' : 'إضافة الجهاز 🏷️'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
