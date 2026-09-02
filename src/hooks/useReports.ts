// src/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'

const KEYS = {
  summary:        ['reports', 'summary']             as const,
  deviceSales:    ['reports', 'device_sales']        as const,
  stockValue:     ['reports', 'stock_value']         as const,
  supplierPurch:  ['reports', 'supplier_purchases']  as const,
  statusCounts:   ['reports', 'status_counts']       as const,
  dailyActivity:  ['reports', 'daily_activity']      as const,
  lowStockDetail: ['reports', 'low_stock_detail']    as const,
  topCustomers:   ['reports', 'top_customers']       as const,
  prodMovement:   (from: string, to: string) => ['reports', 'product_movement', from, to] as const,
  devMovement:    (from: string, to: string) => ['reports', 'device_movement',  from, to] as const,
}

const OPTS = { staleTime: 2 * 60_000 }

export function useReportSummary() {
  return useQuery({ queryKey: KEYS.summary,       queryFn: reportsService.getSummary,           ...OPTS })
}
export function useDeviceSalesReport() {
  return useQuery({ queryKey: KEYS.deviceSales,   queryFn: reportsService.getDeviceSalesSummary, ...OPTS })
}
export function useStockValueReport() {
  return useQuery({ queryKey: KEYS.stockValue,    queryFn: reportsService.getStockValue,         ...OPTS })
}
export function useSupplierPurchasesReport() {
  return useQuery({ queryKey: KEYS.supplierPurch, queryFn: reportsService.getSupplierPurchases,  ...OPTS })
}
export function useDeviceStatusReport() {
  return useQuery({ queryKey: KEYS.statusCounts,  queryFn: reportsService.getDeviceStatusCounts, ...OPTS })
}
export function useDailyActivityReport() {
  return useQuery({ queryKey: KEYS.dailyActivity, queryFn: reportsService.getDailyActivity,      ...OPTS })
}
export function useLowStockReport() {
  return useQuery({ queryKey: KEYS.lowStockDetail,queryFn: reportsService.getLowStockDetailed,   ...OPTS })
}
export function useTopCustomersReport() {
  return useQuery({ queryKey: KEYS.topCustomers,  queryFn: reportsService.getTopCustomers,       ...OPTS })
}

export function useProductMovementReport(from: string, to: string) {
  return useQuery({
    queryKey: KEYS.prodMovement(from, to),
    queryFn:  () => reportsService.getProductMovement(from, to),
    enabled:  !!from && !!to,
    ...OPTS,
  })
}

export function useDeviceMovementReport(from: string, to: string) {
  return useQuery({
    queryKey: KEYS.devMovement(from, to),
    queryFn:  () => reportsService.getDeviceMovement(from, to),
    enabled:  !!from && !!to,
    ...OPTS,
  })
}
