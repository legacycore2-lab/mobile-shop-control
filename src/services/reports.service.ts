// src/services/reports.service.ts
import { reportsRepository, cashierReportRepository } from '@/repositories/reports.repository'
import { expensesRepository } from '@/repositories/expenses.repository'
import { profitabilityService } from '@/services/profitability.service'
import type {
  DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer,
  ProductMovementRow, DeviceMovementRow, DevicePriceRow,
} from '@/repositories/reports.repository'

export type {
  DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer,
  ProductMovementRow, DeviceMovementRow, DevicePriceRow,
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

  getDevicePriceList: (): Promise<DevicePriceRow[]> =>
    reportsRepository.getDevicePriceList(),

  // المبيعات والمصروفات بتتقيد بالفترة، والمخزون لقطة حالية
  getSummary: async (from?: string, to?: string): Promise<ReportSummary> => {
    const [sales, stock, lowStock, invoiceRevenue, totalExpenses, soldRows] = await Promise.all([
      reportsRepository.getDeviceSalesSummary(from, to),
      reportsRepository.getStockValue(),
      reportsRepository.getLowStockDetailed(),
      reportsRepository.getConfirmedInvoicesRevenue(from, to),
      expensesRepository.getTotalInRange(from, to),
      profitabilityService.getRows(from, to),
    ])
    const totalRevenue    = invoiceRevenue
    // تكلفة البضاعة المباعة = أجهزة + منتجات (نفس أساس الإيراد)
    const totalCostSold   = profitabilityService.totals(soldRows).cost
    const totalProfit     = totalRevenue - totalCostSold
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

export interface BrandSalesRow  { brand: string; units: number; revenue: number; cost: number; profit: number }
export interface BrandStockRow  { brand: string; count: number; cost_value: number; sell_value: number }
export interface ExpenseCategoryRow { name: string; total: number; count: number }
export interface ExpenseLike { category_name?: string | null; amount?: number | string | null }

export const reportAggregates = {

  salesByBrand: (sales: DeviceSalesSummary[]): BrandSalesRow[] => {
    const map = new Map<string, BrandSalesRow>()
    for (const r of sales) {
      const e = map.get(r.brand_name) ?? { brand: r.brand_name, units: 0, revenue: 0, cost: 0, profit: 0 }
      e.units   += Number(r.total_units)
      e.revenue += Number(r.total_revenue)
      e.cost    += Number(r.total_cost)
      e.profit  += Number(r.profit)
      map.set(r.brand_name, e)
    }
    return [...map.values()].sort((a, b) => b.units - a.units)
  },

  stockByBrand: (stock: StockValueRow[]): BrandStockRow[] => {
    const map = new Map<string, BrandStockRow>()
    for (const r of stock) {
      const e = map.get(r.brand_name) ?? { brand: r.brand_name, count: 0, cost_value: 0, sell_value: 0 }
      e.count      += Number(r.count)
      e.cost_value += Number(r.total_cost)
      e.sell_value += Number(r.total_selling)
      map.set(r.brand_name, e)
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  },

  expensesByCategory: (expenses: ExpenseLike[]): ExpenseCategoryRow[] => {
    const map = new Map<string, ExpenseCategoryRow>()
    for (const e of expenses) {
      const name = e.category_name ?? 'غير محدد'
      const cur  = map.get(name) ?? { name, total: 0, count: 0 }
      cur.total += Number(e.amount ?? 0)
      cur.count++
      map.set(name, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  },
}

export type { CashierPerformanceRow } from '@/repositories/reports.repository'

export const cashierReportService = {
  getCashierPerformance: (from?: string, to?: string) =>
    cashierReportRepository.getCashierPerformance(from, to),
}
