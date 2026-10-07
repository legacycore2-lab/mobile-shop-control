// src/components/shared/ScanFlashCard.tsx
// بطاقة سريعة تظهر لما تسكن IMEI أو باركود منتج — تختفي تلقائي بعد 8 ثواني
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ShoppingCart, AlertCircle, Wrench, RotateCcw, Ban,
  Smartphone, Copy, Check, FileText, Package,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { fmt } from '@/lib/fmt'

interface DeviceInfo {
  id:              string
  imei1:           string
  imei2:           string | null
  brand_name:      string
  model_name:      string
  color:           string | null
  storage:         string | null
  condition:       string
  battery_health:  number | null
  status:          string
  /** سعر البيع المخطط */
  selling_price:   number
  /** سعر البيع الفعلي — بعد ما الجهاز يتباع */
  sold_price:      number | null
  cost_price:      number
  sold_at:         string | null
  sale_invoice_id: string | null
  customer_name:   string | null
}

interface ProductInfo {
  id:            string
  name:          string
  sku:           string | null
  barcode:       string | null
  category_name: string
  unit:          string
  stock_qty:     number
  cost_price:    number
  selling_price: number
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label:    string
  bg:       string
  text:     string
  dot:      string
  icon:     typeof AlertCircle | null
}> = {
  in_stock:       { label: 'متاح للبيع',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: null },
  sold:           { label: 'مباع',         bg: 'bg-gray-100   dark:bg-gray-800',       text: 'text-gray-600   dark:text-gray-400',    dot: 'bg-gray-400',    icon: Ban     },
  defective:      { label: 'تالف',         bg: 'bg-red-50     dark:bg-red-900/20',     text: 'text-red-600    dark:text-red-400',     dot: 'bg-red-500',     icon: AlertCircle },
  sent_to_repair: { label: 'في الصيانة',  bg: 'bg-amber-50   dark:bg-amber-900/20',   text: 'text-amber-700  dark:text-amber-400',   dot: 'bg-amber-500',   icon: Wrench  },
  returned:       { label: 'مُعاد',        bg: 'bg-blue-50    dark:bg-blue-900/20',    text: 'text-blue-700   dark:text-blue-400',    dot: 'bg-blue-500',    icon: RotateCcw },
  cancelled:      { label: 'ملغي',         bg: 'bg-gray-100   dark:bg-gray-800',       text: 'text-gray-600   dark:text-gray-400',    dot: 'bg-gray-400',    icon: Ban     },
}

const CONDITION_AR: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

const DISMISS_MS = 8000

// ── DB lookup ─────────────────────────────────────────────────────────────────

/** جهاز شغّال الأول، بعده آخر بيع، وأخيراً الملغي — الأحدث الأول جوه كل مجموعة */
function statusRank(status: string): number {
  if (status === 'sold')      return 1
  if (status === 'cancelled') return 2
  return 0
}

async function lookup(code: string): Promise<DeviceInfo | null> {
  const searchImei = code.includes('/') ? code.split('/')[0].trim() : code.trim()
  const { data, error } = await supabase
    .from('mobile_devices')
    .select(`
      id, imei1, imei2, color, storage, condition, battery_health, status,
      selling_price, actual_selling_price, cost_price,
      sold_at, sale_invoice_id, sold_to_customer_id,
      mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
    `)
    .or(`imei1.eq.${searchImei},imei2.eq.${searchImei}`)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (rows.length === 0) return null
  const d     = [...rows].sort((a, b) => statusRank(String(a['status'])) - statusRank(String(b['status'])))[0]
  const model = d['mobile_models'] as Record<string, unknown> | null
  const brand = model?.['mobile_brands'] as Record<string, unknown> | null

  let customerName: string | null = null
  const customerId = d['sold_to_customer_id'] as string | null
  if (d['status'] === 'sold' && customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .maybeSingle()
    customerName = (customer as { name: string } | null)?.name ?? null
  }

  return {
    id:              String(d['id']),
    imei1:           String(d['imei1']),
    imei2:           d['imei2'] as string | null,
    brand_name:      String(brand?.['name'] ?? '—'),
    model_name:      String(model?.['name'] ?? '—'),
    color:           d['color'] as string | null,
    storage:         d['storage'] as string | null,
    condition:       String(d['condition'] ?? 'used'),
    battery_health:  d['battery_health'] != null ? Number(d['battery_health']) : null,
    status:          String(d['status']),
    selling_price:   Number(d['selling_price'] || 0),
    sold_price:      d['actual_selling_price'] != null ? Number(d['actual_selling_price']) : null,
    cost_price:      Number(d['cost_price'] || 0),
    sold_at:         d['sold_at'] as string | null,
    sale_invoice_id: d['sale_invoice_id'] as string | null,
    customer_name:   customerName,
  }
}

async function lookupProduct(code: string): Promise<ProductInfo | null> {
  const clean = code.trim()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, barcode, unit, stock_qty, cost_price, selling_price, product_categories!category_id ( name )')
    .or(`sku.eq.${clean},barcode.eq.${clean}`)
    .limit(1)
  if (error) throw error

  const p = (data ?? [])[0] as unknown as Record<string, unknown> | undefined
  if (!p) return null
  const cat = p['product_categories'] as Record<string, unknown> | null
  return {
    id:            String(p['id']),
    name:          String(p['name']),
    sku:           p['sku'] as string | null,
    barcode:       p['barcode'] as string | null,
    category_name: String(cat?.['name'] ?? '—'),
    unit:          String(p['unit'] ?? 'قطعة'),
    stock_qty:     Number(p['stock_qty'] ?? 0),
    cost_price:    Number(p['cost_price'] || 0),
    selling_price: Number(p['selling_price'] || 0),
  }
}

// ── Small parts ───────────────────────────────────────────────────────────────

function BatteryBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
      البطارية
      <span className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <span className={`block h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      <span className="font-bold tabular-nums text-gray-900 dark:text-white">{pct}%</span>
    </div>
  )
}

function ImeiRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => undefined)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
      <button
        type="button"
        onClick={copy}
        title="نسخ"
        dir="ltr"
        className="inline-flex items-center gap-2 font-mono tabular-nums text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {value}
        {copied
          ? <Check size={14} className="text-emerald-500" />
          : <Copy  size={14} className="text-gray-400 dark:text-gray-500" />}
      </button>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white tabular-nums truncate min-w-0">{children}</span>
    </div>
  )
}

function ProfitText({ value }: { value: number }) {
  const cls = value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return <span className={`${cls} font-semibold tabular-nums`}>{value > 0 ? '+' : ''}{fmt(value)}</span>
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  code:    string
  onClose: () => void
}

export function ScanFlashCard({ code, onClose }: Props) {
  const [device,   setDevice]   = useState<DeviceInfo | null>(null)
  const [product,  setProduct]  = useState<ProductInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [failed,   setFailed]   = useState(false)
  const [progress, setProgress] = useState(100)
  const [visible,  setVisible]  = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuth()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // التكلفة والربح للمالك والمدير بس
  const canSeeCost = profile?.role === 'owner' || profile?.role === 'manager'

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Fetch
  useEffect(() => {
    lookup(code)
      .then(async d => {
        if (d) setDevice(d)
        else   setProduct(await lookupProduct(code))
        setLoading(false)
      })
      .catch(() => { setFailed(true); setLoading(false) })
  }, [code])

  // Auto-close countdown
  useEffect(() => {
    if (loading) return
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed   = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100)
      setProgress(remaining)
      if (remaining === 0) { clearInterval(timerRef.current!); handleClose() }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const st   = device ? (STATUS_CONFIG[device.status] ?? STATUS_CONFIG['in_stock']) : null
  const Icon = st?.icon ?? null
  const isSold = device?.status === 'sold'

  const salePrice   = device?.sold_price ?? 0
  const soldProfit  = device ? salePrice - device.cost_price : 0
  const expectedProfit = device ? device.selling_price - device.cost_price : 0

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center pt-5 px-4"
    >
      <div
        className="pointer-events-auto w-full max-w-sm transition-all duration-200 ease-out"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.96)',
        }}
      >
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Progress strip */}
          <div className="h-[3px] bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-blue-500 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{code.slice(0, 15)}…</p>
            </div>
          )}

          {/* Not found */}
          {!loading && !device && !product && (
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate flex-1 ml-2">{code}</p>
                <button onClick={handleClose} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle size={22} className="text-red-400" />
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {failed ? 'حصلت مشكلة في تحميل البيانات' : 'مش موجود في النظام'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{code}</p>
              </div>
            </div>
          )}

          {/* Product found */}
          {!loading && product && (
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <Package size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">{product.name}</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{product.category_name}</p>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="إغلاق"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors flex-shrink-0 self-start"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3.5 py-3">
                <p className="text-[13px] text-gray-500 dark:text-gray-400">سعر البيع</p>
                <p className="text-[28px] font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                  {fmt(product.selling_price)}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-1">ج</span>
                </p>
                {canSeeCost && (
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-[13px]">
                    <span className="text-gray-500 dark:text-gray-400">
                      التكلفة <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{fmt(product.cost_price)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      الربح للوحدة <ProfitText value={product.selling_price - product.cost_price} />
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                <InfoRow label="المتوفر">{product.stock_qty} {product.unit}</InfoRow>
                {product.sku && <ImeiRow label="SKU" value={product.sku} />}
                {product.barcode && <ImeiRow label="الباركود" value={product.barcode} />}
              </div>
            </div>
          )}

          {/* Device found */}
          {!loading && device && st && (
            <div className="p-4">

              {/* Header: icon + name + close */}
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isSold
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  <Smartphone size={22} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                    {device.brand_name} {device.model_name}
                  </p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {[device.storage, device.color, CONDITION_AR[device.condition] ?? device.condition]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  aria-label="إغلاق"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors flex-shrink-0 self-start"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Status + Battery */}
              <div className="flex items-center justify-between gap-3 mt-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold whitespace-nowrap ${st.bg} ${st.text}`}>
                  {Icon ? <Icon size={13} /> : (
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  )}
                  {st.label}
                </div>

                {device.battery_health != null && !isSold && (
                  <BatteryBar pct={device.battery_health} />
                )}
              </div>

              {/* Price box — الجهاز لسه عندنا */}
              {!isSold && (
                <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3.5 py-3">
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">سعر البيع</p>
                  <p className="text-[28px] font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                    {fmt(device.selling_price)}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-1">ج</span>
                  </p>
                  {canSeeCost && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-[13px]">
                      <span className="text-gray-500 dark:text-gray-400">
                        التكلفة <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{fmt(device.cost_price)}</span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        الربح المتوقع <ProfitText value={expectedProfit} />
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sale details — الجهاز اتباع */}
              {isSold && (
                <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2.5">
                  {device.sold_price != null && <InfoRow label="اتباع بـ">{fmt(device.sold_price)} ج</InfoRow>}
                  {canSeeCost && (
                    <>
                      <InfoRow label="اتشترى بـ">{fmt(device.cost_price)} ج</InfoRow>
                      {device.sold_price != null && (
                        <InfoRow label="الربح"><ProfitText value={soldProfit} /> ج</InfoRow>
                      )}
                    </>
                  )}
                  {(device.customer_name || device.sold_at) && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                      {device.customer_name && <InfoRow label="العميل">{device.customer_name}</InfoRow>}
                      {device.sold_at && (
                        <InfoRow label="تاريخ البيع">{new Date(device.sold_at).toLocaleDateString('en-GB')}</InfoRow>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* IMEI */}
              <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                <ImeiRow label="IMEI 1" value={device.imei1} />
                {device.imei2 && <ImeiRow label="IMEI 2" value={device.imei2} />}
              </div>

              {/* CTA */}
              {device.status === 'in_stock' && (
                <button
                  onClick={() => { handleClose(); navigate('/pos', { state: { autoDeviceId: device.id } }) }}
                  className="mt-3 w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <ShoppingCart size={16} />
                  بيع دلوقتي
                </button>
              )}

              {isSold && device.sale_invoice_id && (
                <button
                  onClick={() => { handleClose(); navigate('/pos', { state: { openSaleId: device.sale_invoice_id } }) }}
                  className="mt-3 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] text-gray-900 dark:text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <FileText size={16} />
                  فتح فاتورة البيع
                </button>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
