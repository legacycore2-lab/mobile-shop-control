// src/lib/exportUtils.ts
// ── CSV / Excel Export Utility ─────────────────────────────────────────────

type Row = Record<string, string | number | boolean | null | undefined>

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCsv(filename: string, headers: { key: string; label: string }[], rows: Row[]): void {
  const headerRow = headers.map(h => escapeCsv(h.label)).join(',')
  const dataRows  = rows.map(row =>
    headers.map(h => escapeCsv(row[h.key])).join(',')
  )
  const csv = [headerRow, ...dataRows].join('\n')

  // Add BOM for Arabic support in Excel
  const bom  = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Device export ──────────────────────────────────────────────────────────

export const DEVICE_EXPORT_HEADERS = [
  { key: 'imei1',         label: 'IMEI 1'          },
  { key: 'imei2',         label: 'IMEI 2'          },
  { key: 'serial_number', label: 'الرقم التسلسلي'  },
  { key: 'brand_name',    label: 'الماركة'          },
  { key: 'model_name',    label: 'الموديل'          },
  { key: 'storage',       label: 'السعة'            },
  { key: 'color',         label: 'اللون'            },
  { key: 'condition',     label: 'الحالة'           },
  { key: 'supplier_name', label: 'المورد'           },
  { key: 'purchase_date', label: 'تاريخ الشراء'     },
  { key: 'cost_price',    label: 'سعر الشراء'       },
  { key: 'selling_price', label: 'سعر البيع'        },
  { key: 'status',        label: 'الحالة'           },
  { key: 'location',      label: 'الموقع'           },
  { key: 'created_at',    label: 'تاريخ الإضافة'    },
]

export const SUPPLIER_EXPORT_HEADERS = [
  { key: 'name',            label: 'الاسم'           },
  { key: 'phone',           label: 'الهاتف'          },
  { key: 'address',         label: 'العنوان'         },
  { key: 'opening_balance', label: 'الرصيد الافتتاحي'},
  { key: 'is_active',       label: 'نشط'             },
  { key: 'created_at',      label: 'تاريخ الإضافة'   },
]

export const CUSTOMER_EXPORT_HEADERS = [
  { key: 'name',            label: 'الاسم'           },
  { key: 'phone',           label: 'الهاتف'          },
  { key: 'address',         label: 'العنوان'         },
  { key: 'national_id',     label: 'الرقم القومي'    },
  { key: 'opening_balance', label: 'الرصيد الافتتاحي'},
  { key: 'is_active',       label: 'نشط'             },
  { key: 'created_at',      label: 'تاريخ الإضافة'   },
]

export const PRODUCT_EXPORT_HEADERS = [
  { key: 'name',          label: 'المنتج'        },
  { key: 'category_name', label: 'الفئة'         },
  { key: 'sku',           label: 'كود المنتج'    },
  { key: 'cost_price',    label: 'سعر الشراء'    },
  { key: 'selling_price', label: 'سعر البيع'     },
  { key: 'stock_qty',     label: 'الكمية'        },
  { key: 'reorder_level', label: 'حد إعادة الطلب'},
  { key: 'unit',          label: 'الوحدة'        },
  { key: 'is_active',     label: 'نشط'           },
]
