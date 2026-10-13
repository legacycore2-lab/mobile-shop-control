// src/pages/reports/reportGroups.ts
import {
  TrendingUp, Package, Truck, Users, DollarSign, BarChart2,
  AlertTriangle, RefreshCw, Tag, Award, type LucideIcon,
} from 'lucide-react'
import type { Tab } from './types'

export interface ReportTabDef { value: Tab; label: string; icon: LucideIcon }
export interface ReportGroup  { id: string; label: string; icon: LucideIcon; tabs: ReportTabDef[] }

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: 'sales', label: 'المبيعات والأرباح', icon: TrendingUp,
    tabs: [
      { value: 'overview',  label: 'نظرة عامة',         icon: BarChart2  },
      { value: 'sales',     label: 'مبيعات الأجهزة',    icon: TrendingUp },
      { value: 'productsales', label: 'مبيعات المنتجات',  icon: Package    },
      { value: 'profit',    label: 'الربحية التفصيلية', icon: TrendingUp },
      { value: 'topprofit', label: 'الأكثر ربحاً',       icon: Award      },
      { value: 'brands',    label: 'تحليل البراندات',   icon: BarChart2  },
    ],
  },
  {
    id: 'stock', label: 'المخزون', icon: Package,
    tabs: [
      { value: 'stock',     label: 'المخزون',             icon: Package       },
      { value: 'movement',  label: 'SOH + حركة المخزون', icon: RefreshCw     },
      { value: 'alerts',    label: 'التنبيهات',           icon: AlertTriangle },
      { value: 'pricelist', label: 'قائمة الأسعار',       icon: Tag           },
    ],
  },
  {
    id: 'parties', label: 'العملاء والموردين', icon: Users,
    tabs: [
      { value: 'customers', label: 'العملاء',  icon: Users },
      { value: 'suppliers', label: 'الموردون', icon: Truck },
    ],
  },
  {
    id: 'perf', label: 'المصروفات والأداء', icon: DollarSign,
    tabs: [
      { value: 'expenses', label: 'المصروفات',    icon: DollarSign },
      { value: 'cashier',  label: 'أداء الكاشير', icon: Users      },
    ],
  },
]

export function groupOfTab(tab: Tab): ReportGroup {
  return REPORT_GROUPS.find(g => g.tabs.some(t => t.value === tab)) ?? REPORT_GROUPS[0]
}
