import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, signOut } from '@/lib/auth'
import {
  LayoutDashboard, Smartphone, ShoppingCart, Package,
  Users, Truck, BarChart3, Settings, LogOut,
  Menu, X, Store, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'الرئيسية',   end: true },
  { to: '/devices',    icon: Smartphone,      label: 'الأجهزة'             },
  { to: '/pos',        icon: ShoppingCart,    label: 'نقطة البيع'          },
  { to: '/purchases',  icon: Package,         label: 'المشتريات'           },
  { to: '/suppliers',  icon: Truck,           label: 'الموردين'            },
  { to: '/customers',  icon: Users,           label: 'العملاء'             },
  { to: '/reports',    icon: BarChart3,       label: 'التقارير'            },
  { to: '/settings',   icon: Settings,        label: 'الإعدادات'           },
]

export function AppShell() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const currentPage = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">

      {/* ─── Mobile overlay ─── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={cn(
        'fixed top-0 right-0 h-full z-30 flex flex-col bg-white border-l border-gray-200',
        'transition-transform duration-300 ease-in-out',
        // mobile: slide in/out
        'w-64 lg:w-64',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Mobile Shop</p>
            <p className="text-xs text-gray-400 truncate">نظام إدارة المحل</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5',
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? '---'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-64">

        {/* Top header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {currentPage?.label ?? 'Mobile Shop'}
            </h1>
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
