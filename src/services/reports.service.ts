// src/services/reports.service.ts
import { reportsRepository, cashierReportRepository } from '@/repositories/reports.repository'
import { expensesRepository } from '@/repositories/expenses.repository'
import type {
  DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer,
  ProductMovementRow, DeviceMovementRow,
} from '@/repositories/reports.repository'

export type {
  DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer,
  ProductMovementRow, DeviceMovementRow,
}

export interface ReportSummary {
  totalSoldDevices:  number
  totalRevenue:      number
  totalCostSold:     number
  totalProfit:       number      // إيراد − تكلفة المباع
  totalExpenses:     number      // إجمالي المصروفات
  netProfit:         number      // إيراد − تكلفة المباع − مصروفات
  avgMargin:         number
  netMargin:         number      // هامش الربح الصافي
  stockDevices:      number
  stockCostValue:    number
  stockSellingValue: number
  lowStockCount:     number
}

export const reportsService = {
  getDeviceSalesSummary: (from?: string, to?: string) => reportsRepository.getDeviceSalesSummary(from, to),
  getStockValue:         () => reportsRepository.getStockValue(),
  getSupplierPurchases:  (from?: string, to?: string) => reportsRepository.getSupplierPurchases(from, to),
  getDeviceStatusCounts: () => reportsRepository.getDeviceStatusCounts(),
  getDailyActivity:      () => reportsRepository.getDailyActivity(),
  getLowStockDetailed:   () => reportsRepository.getLowStockDetailed(),
  getTopCustomers:       (from?: string, to?: string) => reportsRepository.getTopCustomers(from, to),

  getProductMovement: (from: string, to: string): Promise<ProductMovementRow[]> =>
    reportsRepository.getProductMovement(from, to),

  getDeviceMovement: (from: string, to: string): Promise<DeviceMovementRow[]> =>
    reportsRepository.getDeviceMovement(from, to),

  getSummary: async (): Promise<ReportSummary> => {
    const [sales, stock, lowStock, invoiceRevenue, expenseStats] = await Promise.all([
      reportsRepository.getDeviceSalesSummary(undefined, undefined),
      reportsRepository.getStockValue(),
      reportsRepository.getLowStockDetailed(),
      reportsRepository.getConfirmedInvoicesRevenue(),
      expensesRepository.getStats(),
    ])
    const totalRevenue    = invoiceRevenue
    const totalCostSold   = sales.reduce((s, r) => s + r.total_cost,    0)
    const totalProfit     = totalRevenue - totalCostSold
    const totalExpenses   = expenseStats.total
    const netProfit       = totalProfit - totalExpenses
    const totalUnits      = sales.reduce((s, r) => s + r.total_units,   0)
    const stockDevices    = stock.reduce((s, r) => s + r.count,         0)
    const stockCostValue  = stock.reduce((s, r) => s + r.total_cost,    0)
    const stockSellValue  = stock.reduce((s, r) => s + r.total_selling, 0)
    return {
      totalSoldDevices:  totalUnits,
      totalRevenue,
      totalCostSold,
      totalProfit,
      totalExpenses,
      netProfit,
      avgMargin: totalCostSold > 0
        ? parseFloat(((totalProfit / totalCostSold) * 100).toFixed(1)) : 0,
      netMargin: totalRevenue > 0
        ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0,
      stockDevices,
      stockCostValue,
      stockSellingValue: stockSellValue,
      lowStockCount:     lowStock.length,
    }
  },
}

export type { CashierPerformanceRow } from '@/repositories/reports.repository'

export const cashierReportService = {
  getCashierPerformance: (from?: string, to?: string) =>
    cashierReportRepository.getCashierPerformance(from, to),
}
