// src/components/layout/AppShell.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, signOut } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import {
  UserCheck, LayoutDashboard, Smartphone, ShoppingCart, Package,
  Users, Truck, BarChart3, Settings, LogOut,
  Menu, X, Store, Sun, Moon, Tag, Shield, ShieldCheck,
  BookOpen, FileUp, Receipt, Bell, RefreshCw, Home,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAlertCount, useStockNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'
import type { Resource } from '@/lib/permissions'

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV: { to: string; icon: React.ElementType; label: string; end?: boolean; resource: Resource }[] = [
  { to: '/',            icon: LayoutDashboard, label: 'الرئيسية',          end: true, resource: 'dashboard'   },
  { to: '/devices',     icon: Smartphone,      label: 'الأجهزة',                      resource: 'devices'     },
  { to: '/pos',         icon: ShoppingCart,    label: 'نقطة البيع',                   resource: 'pos'         },
  { to: '/purchases',   icon: Package,         label: 'المشتريات',                    resource: 'purchases'   },
  { to: '/products',    icon: Tag,             label: 'المنتجات',                     resource: 'products'    },
  { to: '/suppliers',   icon: Truck,           label: 'الموردين',                     resource: 'suppliers'   },
  { to: '/customers',   icon: Users,           label: 'العملاء',                      resource: 'customers'   },
  { to: '/expenses',    icon: Receipt,         label: 'المصروفات',                    resource: 'expenses'    },
  { to: '/attendance',  icon: UserCheck,       label: 'الحضور والانصراف',             resource: 'attendance'  },
  { to: '/reports',     icon: BarChart3,       label: 'التقارير',                     resource: 'reports'     },
  { to: '/ledger',      icon: BookOpen,        label: 'الحسابات',                     resource: 'ledger'      },
  { to: '/audit',       icon: Shield,          label: 'سجل العمليات',                 resource: 'audit'       },
  { to: '/import',      icon: FileUp,          label: 'استيراد البيانات',             resource: 'import'      },
  { to: '/settings',    icon: Settings,        label: 'الإعدادات',                    resource: 'settings'    },
  { to: '/permissions', icon: ShieldCheck,     label: 'الصلاحيات',                    resource: 'permissions' },
]

interface Tab {
  path: string
  label: string
  icon: React.ElementType
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({
  tabs,
  activePath,
  onSelect,
  onClose,
}: {
  tabs: Tab[]
  activePath: string
  onSelect: (path: string) => void
  onClose: (path: string, e: React.MouseEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activePath])

  if (tabs.length === 0) return null

  return (
    <div className="relative flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/80">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.path === activePath
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              data-active={isActive}
              onClick={() => onSelect(tab.path)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap',
                'border-l border-gray-200 dark:border-gray-800 first:border-l-0',
                'transition-all duration-150 flex-shrink-0 min-w-0 max-w-[160px]',
                isActive
                  ? 'bg-white dark:bg-gray-950 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200',
              )}
            >
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-b" />
              )}

              <Icon size={13} className="flex-shrink-0" />
              <span className="truncate">{tab.label}</span>

              {/* Close button */}
              <span
                role="button"
                onClick={(e) => onClose(tab.path, e)}
                className={cn(
                  'flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ml-1',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  isActive && 'opacity-60',
                  'hover:bg-gray-300 dark:hover:bg-gray-700 hover:opacity-100 hover:text-red-500',
                )}
              >
                <X size={10} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export function AppShell() {
  const { profile } = useAuth()
  const perm        = usePermissions()
  const { isDark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [tabs, setTabs]               = useState<Tab[]>([])
  const qc       = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()

  useStockNotifications()
  const alertCount = useAlertCount()

  const visibleNav = NAV.filter(n => perm.canView(n.resource as Resource))

  // ── Tab management ────────────────────────────────────────────────────────
  const currentNavItem = useCallback((path: string) =>
    NAV.find(n => n.end ? path === n.to : path.startsWith(n.to))
  , [])

  useEffect(() => {
    const path = location.pathname
    const navItem = currentNavItem(path)
    if (!navItem) return

    setTabs(prev => {
      // already open → just activate
      if (prev.find(t => t.path === path)) return prev
      // add new tab
      return [...prev, { path, label: navItem.label, icon: navItem.icon }]
    })
  }, [location.pathname, currentNavItem])

  function handleTabSelect(path: string) {
    navigate(path)
    setSidebarOpen(false)
  }

  function handleTabClose(path: string, e: React.MouseEvent) {
    e.stopPropagation()
    setTabs(prev => {
      const idx     = prev.findIndex(t => t.path === path)
      const next    = prev.filter(t => t.path !== path)
      // If closing active tab → navigate to adjacent
      if (path === location.pathname) {
        const target = next[idx] ?? next[idx - 1] ?? null
        if (target) navigate(target.path)
        else navigate('/')
      }
      return next
    })
  }

  function handleCloseAll() {
    setTabs([])
    navigate('/')
  }

  async function handleRefresh() {
    setRefreshing(true)
    await qc.invalidateQueries()
    setTimeout(() => setRefreshing(false), 800)
  }

  const activeNavItem = currentNavItem(location.pathname)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden" dir="rtl">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={cn(
        'fixed top-0 right-0 h-full z-30 flex flex-col',
        'bg-white dark:bg-gray-900',
        'border-l border-gray-200 dark:border-gray-800',
        'transition-transform duration-300 ease-in-out w-60',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Store size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">الشافعي ستور</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">نظام إدارة المحل</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {visibleNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5',
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {to === '/products' && alertCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile?.full_name ?? '---'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={toggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'وضع النهار' : 'الوضع الليلي'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-60 overflow-hidden">

        {/* Top header */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>

          {/* Home shortcut */}
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              'hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300',
            )}
            title="الرئيسية"
          >
            <Home size={16} />
          </NavLink>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {activeNavItem?.label ?? 'الشافعي ستور'}
            </h1>
          </div>

          {/* Alert bell */}
          {alertCount > 0 && (
            <NavLink
              to="/products"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title={`${alertCount} منتج بمخزون منخفض`}
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            </NavLink>
          )}

          {/* Refresh */}
          <button
            onClick={() => void handleRefresh()}
            title="تحديث البيانات"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-blue-500' : ''} />
          </button>

          {/* Theme toggle desktop */}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'وضع النهار' : 'الوضع الليلي'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {/* ── Tab Bar ───────────────────────────────────────────────────── */}
        {tabs.length > 0 && (
          <div className="flex items-stretch border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/80 flex-shrink-0">
            <div className="flex-1 overflow-hidden">
              <TabBar
                tabs={tabs}
                activePath={location.pathname}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
              />
            </div>
            {/* Close all tabs */}
            {tabs.length > 1 && (
              <button
                onClick={handleCloseAll}
                title="إغلاق كل التبويبات"
                className="flex-shrink-0 px-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-r border-gray-200 dark:border-gray-800 text-xs"
              >
                إغلاق الكل
              </button>
            )}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
