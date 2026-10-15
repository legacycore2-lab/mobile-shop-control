// src/pages/stock-count/CreateStockCountCard.tsx
import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useCreateStockCount, useStockCountEmployees } from '@/hooks/useStockCount'
import { friendlyDbError } from '@/lib/errors'
import { FIELD_CLASS } from './constants'

export function CreateStockCountCard() {
  const { data: employees = [], isLoading } = useStockCountEmployees()
  const create = useCreateStockCount()

  const [employeeId, setEmployeeId] = useState('')
  const [products,   setProducts]   = useState('5')
  const [models,     setModels]     = useState('3')
  const [error,      setError]      = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    try {
      await create.mutateAsync({
        employeeId,
        productsCount: Number(products),
        modelsCount:   Number(models),
      })
    } catch (err) {
      setError(friendlyDbError(err))
    }
  }

  return (
    <Card>
      <CardHeader
        title="جرد عشوائي جديد"
        subtitle="النظام بيختار أصناف عشوائية، والمسئول بيراجعها من رابط خارجي"
      />

      {!isLoading && employees.length === 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          مفيش موظفين مسجلين — أضف موظف من صفحة الحضور والانصراف الأول.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="block lg:col-span-2">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">المسئول عن الجرد</span>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className={FIELD_CLASS}>
              <option value="">اختار المسئول…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.job_title ? `${e.name} — ${e.job_title}` : e.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">عدد المنتجات</span>
            <input type="number" inputMode="numeric" min={0} max={50} value={products}
              onChange={e => setProducts(e.target.value)} className={FIELD_CLASS} />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">عدد الموبايلات (موديلات)</span>
            <input type="number" inputMode="numeric" min={0} max={50} value={models}
              onChange={e => setModels(e.target.value)} className={FIELD_CLASS} />
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <Button variant="primary" icon={<Shuffle size={15} />} loading={create.isPending}
              disabled={!employeeId} onClick={() => void handleCreate()}>
              إنشاء جرد اليوم
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  )
}
