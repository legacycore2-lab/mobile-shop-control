import { Smartphone, TrendingUp, AlertTriangle, Package, ArrowLeft } from 'lucide-react'
import { StatCard, Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Stats grid - responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="أجهزة في المخزون" value="0"  color="blue"   icon={<Smartphone size={20} />} />
        <StatCard label="مبيعات اليوم"      value="0 ج" color="green" icon={<TrendingUp  size={20} />} />
        <StatCard label="فواتير اليوم"      value="0"  color="purple" icon={<Package     size={20} />} />
        <StatCard label="تنبيهات"           value="0"  color="amber"  icon={<AlertTriangle size={20} />} />
      </div>

      {/* Two columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Recent devices */}
        <Card padding={false}>
          <CardHeader
            title="آخر الأجهزة المضافة"
            subtitle="أحدث 5 أجهزة"
            className="px-5 pt-5"
            actions={
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                عرض الكل <ArrowLeft size={12} />
              </button>
            }
          />
          <div className="px-5 pb-4">
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Smartphone size={32} className="mb-2 opacity-30" />
              <p className="text-sm">لم يتم إضافة أجهزة بعد</p>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card padding={false}>
          <CardHeader
            title="التنبيهات"
            subtitle="مخزون منخفض ومستحقات"
            className="px-5 pt-5"
          />
          <div className="px-5 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">لا توجد تنبيهات حالياً</span>
                <Badge variant="success" dot>طبيعي</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
