// src/types/dailyClose.ts

export type CashMethod = 'cash' | 'bank_transfer' | 'check' | 'other'

export interface CashMethodRow {
  method:  CashMethod
  cashIn:  number
  cashOut: number
  net:     number
}

export interface ExpenseCategoryRow {
  name:   string
  amount: number
}

export interface DebtorRow {
  customerId: string
  name:       string
  phone:      string | null
  balance:    number
}

export interface SaleInvoiceSummary {
  id:           string
  number:       string
  customerName: string | null
  total:        number
  paid:         number
  remaining:    number
}

export interface SoldItemRow {
  kind:     'device' | 'product'
  name:     string
  quantity: number
  amount:   number
}

export interface PurchaseInvoiceSummary {
  id:           string
  number:       string
  supplierName: string
  total:        number
  paid:         number
}

export interface CreditorRow {
  supplierId: string
  name:       string
  phone:      string | null
  balance:    number
}

export interface DailyClose {
  date: string

  sales: {
    invoiceCount: number
    revenue:      number
    discount:     number
    costOfGoods:  number
    grossProfit:  number
    marginPct:    number
    invoices:     SaleInvoiceSummary[]
    items:        SoldItemRow[]
    devices:      { quantity: number; amount: number }
    products:     { quantity: number; amount: number }
  }

  purchases: {
    invoiceCount: number
    total:        number
    paid:         number
    invoices:     PurchaseInvoiceSummary[]
  }

  cash: {
    totalIn:           number
    totalOut:          number
    net:               number
    fromTodaySales:    number
    fromOlderInvoices: number
    toSuppliers:       number
    expenses:          number
    byMethod:          CashMethodRow[]
  }

  expenses: {
    total:      number
    byCategory: ExpenseCategoryRow[]
  }

  netProfit: number

  receivables: {
    totalOutstanding: number
    debtorCount:      number
    newToday:         number
    topDebtors:       DebtorRow[]
  }

  payables: {
    totalOutstanding: number
    creditorCount:    number
    topCreditors:     CreditorRow[]
  }
}
