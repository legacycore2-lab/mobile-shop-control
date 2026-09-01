import { useState } from 'react'
import {
  Store, Users, Shield, Moon, Sun, Bell,
  Save, RefreshCw, CheckCircle, AlertCircle,
  User, Lock, Phone, Mail,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useSupplierStats } from '@/hooks/useSuppliers'
import { useCustomerStats } from '@/hooks/useCustomers'
import { useDeviceStats } from '@/hooks/useDevices'
import { useProductStats } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ar-EG') }

const ROLE_MAP: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' }> = {
  owner:     { label: 'المالك',     variant: 'info'    },
  manager:   { label: 'مدير',       variant: 'success' },
  cashier:   { label: 'كاشير',      variant: 'warning' },
  warehouse: { label: 'مخزن',       variant: 'neutral' },
}

type Tab = 'profile' | 'system' | 'appearance'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Stat Row ──────────────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={cn('text-sm font-bold', color ?? 'text-gray-900 dark:text-white')}>{value}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { profile }      = useAuth()
  const { isDark, toggle } = useTheme()
  const [tab, setTab]    = useState<Tab>('profile')

  // Stats
  const { data: deviceStats  } = useDeviceStats()
  const { data: productStats } = useProductStats()
  const { data: supplierStats } = useSupplierStats()
  const { data: customerStats } = useCustomerStats()

  // Profile form
  const [fullName,  setFullName]  = useState(profile?.full_name ?? '')
  const [phone,     setPhone]     = useState(profile?.phone ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form
  const [oldPass,   setOldPass]   = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [newPass2,  setNewPass2]  = useState('')
  const [passMsg,   setPassMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passLoad,  setPassLoad]  = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null } as never)
        .eq('id', profile.id)
      if (error) throw error
      setSaveMsg({ type: 'success', text: 'تم حفظ البيانات بنجاح' })
    } catch (e) {
      setSaveMsg({ type: 'error', text: e instanceof Error ? e.message : 'حدث خطأ' })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(null)
    if (!newPass.trim())          { setPassMsg({ type: 'error', text: 'أدخل كلمة المرور الجديدة' }); return }
    if (newPass.length < 6)       { setPassMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }); return }
    if (newPass !== newPass2)     { setPassMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين' }); return }
    setPassLoad(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      setPassMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
      setOldPass(''); setNewPass(''); setNewPass2('')
    } catch (err) {
      setPassMsg({ type: 'error', text: err instanceof Error ? err.message : 'حدث خطأ' })
    } finally {
      setPassLoad(false)
    }
  }

  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'

  const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
    { value: 'profile',    label: 'الملف الشخصي', icon: User    },
    { value: 'system',     label: 'إحصائيات النظام', icon: Store  },
    { value: 'appearance', label: 'المظهر',        icon: Moon    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الإعدادات</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إدارة الحساب وإعدادات النظام</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 flex gap-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              tab === value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab === 'profile' && (
        <div className="space-y-5">

          {/* Current user card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xl font-bold flex-shrink-0">
                {profile?.full_name?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 dark:text-white">{profile?.full_name ?? '—'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{profile?.phone ?? 'لا يوجد رقم هاتف'}</p>
                <div className="mt-1.5">
                  {profile?.role && (
                    <Badge variant={ROLE_MAP[profile.role]?.variant ?? 'neutral'}>
                      {ROLE_MAP[profile.role]?.label ?? profile.role}
                    </Badge>
                  )}
                </div>
              </div>
              <div className={cn('w-3 h-3 rounded-full flex-shrink-0', profile?.is_active ? 'bg-green-500' : 'bg-red-500')} />
            </div>
          </div>

          {/* Edit profile */}
          <Section title="تعديل البيانات الشخصية" sub="الاسم ورقم الهاتف">
            <form onSubmit={e => void handleSaveProfile(e)} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>الاسم الكامل <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="الاسم الكامل" required
                    className={cn(inputCls, 'pr-9')} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>رقم الهاتف</label>
                <div className="relative">
                  <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX" dir="ltr"
                    className={cn(inputCls, 'pr-9 text-right')} />
                </div>
              </div>
              {saveMsg && (
                <div className={cn('flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm border',
                  saveMsg.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400')}>
                  {saveMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {saveMsg.text}
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </Section>

          {/* Change password */}
          <Section title="تغيير كلمة المرور" sub="يتطلب إعادة تسجيل الدخول بعد التغيير">
            <form onSubmit={e => void handleChangePassword(e)} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>كلمة المرور الجديدة <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                    placeholder="6 أحرف على الأقل" minLength={6}
                    className={cn(inputCls, 'pr-9')} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>تأكيد كلمة المرور <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className={cn(inputCls, 'pr-9', newPass2 && newPass !== newPass2 && 'border-red-400 focus:border-red-400 focus:ring-red-400/10')} />
                </div>
                {newPass2 && newPass !== newPass2 && (
                  <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                )}
              </div>
              {passMsg && (
                <div className={cn('flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm border',
                  passMsg.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400')}>
                  {passMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {passMsg.text}
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={passLoad}
                  className="h-9 px-5 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                  {passLoad ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                  تغيير كلمة المرور
                </button>
              </div>
            </form>
          </Section>

          {/* Role info */}
          <Section title="الصلاحيات" sub="مستوى وصولك في النظام">
            <div className="space-y-0">
              {[
                ['الدور الوظيفي', ROLE_MAP[profile?.role ?? '']?.label ?? '—'],
                ['حالة الحساب',   profile?.is_active ? 'نشط' : 'موقوف'],
                ['تاريخ الإنشاء', profile ? new Date(profile.created_at).toLocaleDateString('ar-EG') : '—'],
              ].map(([label, value]) => (
                <StatRow key={label} label={label} value={value} />
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── System Tab ── */}
      {tab === 'system' && (
        <div className="space-y-5">
          <Section title="إحصائيات الأجهزة" sub="المخزون الحالي">
            <div className="space-y-0">
              <StatRow label="إجمالي الأجهزة"  value={fmt(deviceStats?.total    ?? 0)} />
              <StatRow label="في المخزون"       value={fmt(deviceStats?.inStock  ?? 0)} color="text-blue-600 dark:text-blue-400" />
              <StatRow label="مباع"             value={fmt(deviceStats?.sold     ?? 0)} color="text-green-600 dark:text-green-400" />
              <StatRow label="في الصيانة"       value={fmt(deviceStats?.repair   ?? 0)} color="text-amber-600 dark:text-amber-400" />
              <StatRow label="تالف"             value={fmt(deviceStats?.defective ?? 0)} color="text-red-600 dark:text-red-400" />
              <StatRow label="قيمة المخزون (تكلفة)" value={`${fmt(deviceStats?.totalCostValue ?? 0)} ج`} color="text-purple-600 dark:text-purple-400" />
              <StatRow label="قيمة المخزون (بيع)"   value={`${fmt(deviceStats?.totalSellingValue ?? 0)} ج`} color="text-teal-600 dark:text-teal-400" />
            </div>
          </Section>

          <Section title="إحصائيات المنتجات" sub="الإكسسوارات وقطع الغيار">
            <div className="space-y-0">
              <StatRow label="إجمالي المنتجات"  value={fmt(productStats?.total       ?? 0)} />
              <StatRow label="إكسسوارات"        value={fmt(productStats?.accessories  ?? 0)} />
              <StatRow label="قطع غيار"         value={fmt(productStats?.spareParts   ?? 0)} />
              <StatRow label="مخزون منخفض"      value={fmt(productStats?.lowStock     ?? 0)} color={(productStats?.lowStock ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
              <StatRow label="قيمة المخزون (تكلفة)" value={`${fmt(productStats?.totalCostValue ?? 0)} ج`} />
              <StatRow label="قيمة المخزون (بيع)"   value={`${fmt(productStats?.totalSellingValue ?? 0)} ج`} />
            </div>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="الموردون">
              <div className="space-y-0">
                <StatRow label="الإجمالي"  value={fmt(supplierStats?.total    ?? 0)} />
                <StatRow label="نشطون"     value={fmt(supplierStats?.active   ?? 0)} color="text-green-600 dark:text-green-400" />
                <StatRow label="غير نشطين" value={fmt(supplierStats?.inactive ?? 0)} />
                <StatRow label="إجمالي الأرصدة" value={`${fmt(supplierStats?.totalBalance ?? 0)} ج`} />
              </div>
            </Section>
            <Section title="العملاء">
              <div className="space-y-0">
                <StatRow label="الإجمالي"  value={fmt(customerStats?.total    ?? 0)} />
                <StatRow label="نشطون"     value={fmt(customerStats?.active   ?? 0)} color="text-green-600 dark:text-green-400" />
                <StatRow label="غير نشطين" value={fmt(customerStats?.inactive ?? 0)} />
                <StatRow label="إجمالي الأرصدة" value={`${fmt(customerStats?.totalBalance ?? 0)} ج`} />
              </div>
            </Section>
          </div>

          {/* System info */}
          <Section title="معلومات النظام">
            <div className="space-y-0">
              <StatRow label="الإصدار"      value="1.0.0" />
              <StatRow label="Stack"         value="React + Supabase + TanStack Query" />
              <StatRow label="قاعدة البيانات" value="Supabase (PostgreSQL)" />
              <StatRow label="التخزين السحابي" value="Supabase Storage" />
            </div>
          </Section>
        </div>
      )}

      {/* ── Appearance Tab ── */}
      {tab === 'appearance' && (
        <div className="space-y-5">
          <Section title="المظهر" sub="اختر وضع العرض المناسب">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => !isDark && toggle()}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                  !isDark
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}>
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                  <Sun size={22} className="text-amber-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">وضع النهار</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">خلفية فاتحة</p>
                </div>
                {!isDark && <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />}
              </button>

              <button onClick={() => isDark && toggle()}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                  isDark
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}>
                <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 shadow-sm flex items-center justify-center">
                  <Moon size={22} className="text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">الوضع الليلي</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">خلفية داكنة</p>
                </div>
                {isDark && <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />}
              </button>
            </div>
          </Section>

          <Section title="اللغة والمنطقة" sub="إعدادات العرض">
            <div className="space-y-0">
              <StatRow label="اللغة"        value="العربية" />
              <StatRow label="اتجاه الكتابة" value="من اليمين إلى اليسار (RTL)" />
              <StatRow label="تنسيق الأرقام" value="عربي (٠١٢٣٤)" />
              <StatRow label="تنسيق التاريخ" value="يوم/شهر/سنة" />
              <StatRow label="العملة"        value="جنيه مصري (ج.م)" />
            </div>
          </Section>

          <Section title="الإشعارات" sub="قريباً">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-400 dark:text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">تنبيهات المخزون</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">عند وصول المخزون للحد الأدنى</p>
                </div>
              </div>
              <Badge variant="neutral">قريباً</Badge>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
