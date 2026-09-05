// src/pages/reports/types.ts
export type Tab = 'overview' | 'sales' | 'stock' | 'suppliers' | 'customers' | 'alerts' | 'movement'

export interface SalesRow { brand_name:string; model_name:string; total_units:number; total_cost:number; total_revenue:number; profit:number; margin_pct:number }
export interface StockRow { brand_name:string; model_name:string; count:number; total_cost:number; total_selling:number }
export interface SupplierRow { supplier_id?:string; supplier_name:string; total_devices:number; total_cost:number }
export interface CustomerRow { customer_name:string; device_count:number; total_spent:number }
export interface AlertRow { product_name:string; category_name:string; stock_qty:number; reorder_level:number; cost_price:number; selling_price:number; stock_value:number }
export interface ProductMovRow { name:string; category_name:string; sku:string|null; unit:string; opening_stock:number; purchased:number; sold:number; current_stock:number; cost_price:number; selling_price:number; stock_value:number; needs_reorder:boolean }
export interface DeviceMovRow { brand_name:string; model_name:string; total:number; in_stock:number; sold_in_period:number; purchased_in_period:number; total_revenue:number; total_profit:number }
export interface ReportSummaryData { totalSoldDevices:number; totalRevenue:number; totalCostSold:number; totalProfit:number; avgMargin:number; stockDevices:number; stockCostValue:number; stockSellingValue:number; lowStockCount:number }
