// src/pages/stock-reconcile/DeviceTable.tsx
import { Printer, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DEVICE_STATUS_MAP } from '@/constants/statusMaps'
import { fmt } from '@/lib/fmt'
import type { ReconcileDevice } from '@/types/stockReconcile'

interface Props {
  devices:    ReconcileDevice[]
  showStatus?: boolean
  showCost:   boolean
  onSell?:    (device: ReconcileDevice) => void   // لو موجود بيظهر زرار «بيع» لكل جهاز
  onPrint?:   (device: ReconcileDevice) => void   // لو موجود بيظهر زرار «ليبل» للأجهزة المطابقة
  matchedIds?: ReadonlySet<string>                 // الأجهزة اللي اتمسحت (مطابقة) — بيظهر جنبها «مطابق»
}

export function DeviceTable({ devices, showStatus = false, showCost, onSell, onPrint, matchedIds }: Props) {
  const heads = [
    '#',
    ...(matchedIds ? ['المطابقة'] : []),
    'الجهاز', 'IMEI 1', 'IMEI 2', 'تخزين', 'لون',
    ...(showStatus ? ['الحالة في النظام'] : []),
    ...(showCost ? ['سعر الشراء'] : []),
    'سعر البيع', 'تاريخ الشراء',
    ...(onSell ? ['بيع'] : []),
    ...(onPrint ? ['ليبل'] : []),
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-200 dark:border-gray-800">
            {heads.map(h => (
              <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {devices.map((d, i) => {
            const st = DEVICE_STATUS_MAP[d.status]
            return (
              <tr key={d.id}>
                <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                {matchedIds && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {matchedIds.has(d.id)
                      ? <Badge variant="success">مطابق</Badge>
                      : <Badge variant="neutral">لسه</Badge>}
                  </td>
                )}
                <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{d.brand_name} {d.model_name}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{d.imei1}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">{d.imei2 || '—'}</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{d.storage || '—'}</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{d.color || '—'}</td>
                {showStatus && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Badge variant={st.variant} dot>{st.label}</Badge>
                  </td>
                )}
                {showCost && <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(d.cost_price)} ج</td>}
                <td className="px-3 py-2.5 font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                  {d.selling_price == null ? '—' : `${fmt(d.selling_price)} ج`}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{d.purchase_date}</td>
                {onSell && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {!matchedIds?.has(d.id) && (
                      <Button size="sm" variant="primary" icon={<ShoppingCart size={14} />} onClick={() => onSell(d)}>بيع</Button>
                    )}
                  </td>
                )}
                {onPrint && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {(!matchedIds || matchedIds.has(d.id)) && (
                      <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => onPrint(d)}>طباعة ليبل</Button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
