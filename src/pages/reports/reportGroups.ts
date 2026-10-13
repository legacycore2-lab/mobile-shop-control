// src/pages/reports/reportGroups.ts
import {
  TrendingUp, Package, Truck, Users, DollarSign, BarChart2,
  AlertTriangle, RefreshCw, Tag, Award, type LucideIcon,
} from 'lucide-react'
import type { NumberKind } from '@/lib/permissions'
import type { Tab } from './types'

export interface ReportTabDef { value: Tab; label: string; icon: LucideIcon; needs: NumberKind[] }
export interface ReportGroup  { id: string; label: string; icon: LucideIcon; tabs: ReportTabDef[] }

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: 'sales', label: 'المبيعات والأرباح', icon: TrendingUp,
    tabs: [
      { value: 'overview',  label: 'نظرة عامة',         icon: BarChart2, needs: ['revenue','profit','cost'] },
      { value: 'sales',     label: 'مبيعات الأجهزة',    icon: TrendingUp, needs: ['revenue','profit','cost'] },
      { value: 'productsales', label: 'مبيعات المنتجات',  icon: Package, needs: ['revenue','profit','cost'] },
      { value: 'profit',    label: 'الربحية التفصيلية', icon: TrendingUp, needs: ['revenue','profit','cost'] },
      { value: 'topprofit', label: 'الأكثر ربحاً',       icon: Award, needs: ['profit'] },
      { value: 'brands',    label: 'تحليل البراندات',   icon: BarChart2, needs: ['revenue','profit'] },
    ],
  },
  {
    id: 'stock', label: 'المخزون', icon: Package,
    tabs: [
      { value: 'stock',     label: 'المخزون',             icon: Package, needs: ['cost'] },
      { value: 'movement',  label: 'SOH + حركة المخزون', icon: RefreshCw, needs: ['revenue','profit','cost'] },
      { value: 'alerts',    label: 'التنبيهات',           icon: AlertTriangle, needs: ['cost'] },
      { value: 'pricelist', label: 'قائمة الأسعار',       icon: Tag, needs: ['cost'] },
    ],
  },
  {
    id: 'parties', label: 'العملاء والموردين', icon: Users,
    tabs: [
      { value: 'customers', label: 'العملاء',  icon: Users, needs: ['revenue'] },
      { value: 'suppliers', label: 'الموردون', icon: Truck, needs: ['cost','balances'] },
    ],
  },
  {
    id: 'perf', label: 'المصروفات والأداء', icon: DollarSign,
    tabs: [
      { value: 'expenses', label: 'المصروفات',    icon: DollarSign, needs: [] },
      { value: 'cashier',  label: 'أداء الكاشير', icon: Users, needs: ['revenue'] },
    ],
  },
]

export function groupOfTab(tab: Tab): ReportGroup {
  return REPORT_GROUPS.find(g => g.tabs.some(t => t.value === tab)) ?? REPORT_GROUPS[0]
}

export type NumberVisibility = Record<NumberKind, boolean>

export function visibleGroups(vis: NumberVisibility): ReportGroup[] {
  return REPORT_GROUPS
    .map(g => ({ ...g, tabs: g.tabs.filter(t => t.needs.every(k => vis[k])) }))
    .filter(g => g.tabs.length > 0)
}
