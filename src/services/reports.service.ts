import { reportsRepository } from '@/repositories/reports.repository'
import type {
  DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer,
} from '@/repositories/reports.repository'

export type { DeviceSalesSummary, StockValueRow, SupplierPurchaseSummary,
  DeviceStatusCount, DailyActivity, ProductStockAlert, TopCustomer }

export interface ReportSummary {
  totalSoldDevices:  number
  totalRevenue:      number
  totalCostSold:     number
  totalProfit:       number
  avgMargin:         number
  stockDevices:      number
  stockCostValue:    number
  stockSellingValue: number
  lowStockCount:     number
}

export const reportsService = {

  getDeviceSalesSummary: () => reportsRepository.getDeviceSalesSummary(),

  getStockValue: () => reportsRepository.getStockValue(),

  getSupplierPurchases: () => reportsRepository.getSupplierPurchases(),

  getDeviceStatusCounts: () => reportsRepository.getDeviceStatusCounts(),

  getDailyActivity: () => reportsRepository.getDailyActivity(),

  getLowStockDetailed: () => reportsRepository.getLowStockDetailed(),

  getTopCustomers: () => reportsRepository.getTopCustomers(),

  getSummary: async (): Promise<ReportSummary> => {
    const [sales, stock, lowStock] = await Promise.all([
      reportsRepository.getDeviceSalesSummary(),
      reportsRepository.getStockValue(),
      reportsRepository.getLowStockDetailed(),
    ])

    const totalRevenue   = sales.reduce((s, r) => s + r.total_revenue, 0)
    const totalCostSold  = sales.reduce((s, r) => s + r.total_cost,    0)
    const totalProfit    = totalRevenue - totalCostSold
    const totalUnits     = sales.reduce((s, r) => s + r.total_units,   0)
    const stockDevices   = stock.reduce((s, r) => s + r.count,         0)
    const stockCostValue = stock.reduce((s, r) => s + r.total_cost,    0)
    const stockSellValue = stock.reduce((s, r) => s + r.total_selling, 0)

    return {
      totalSoldDevices:  totalUnits,
      totalRevenue,
      totalCostSold,
      totalProfit,
      avgMargin:         totalCostSold > 0
        ? parseFloat(((totalProfit / totalCostSold) * 100).toFixed(1))
        : 0,
      stockDevices,
      stockCostValue,
      stockSellingValue: stockSellValue,
      lowStockCount:     lowStock.length,
    }
  },
}
