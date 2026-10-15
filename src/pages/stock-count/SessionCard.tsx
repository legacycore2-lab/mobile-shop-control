// src/pages/stock-count/SessionCard.tsx
import { useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { buildStockCountLink, buildWhatsappLink } from '@/services/stockCount.service'
import type { StockCountSessionView } from '@/types/stockCount'
import { ItemResultRow } from './ItemResultRow'

interface Props {
  session:     StockCountSessionView
  defaultOpen: boolean
}

function StatusBadge({ session }: { session: StockCountSessionView }) {
  if (session.status === 'pending') return <Badge variant="warning" dot>في انتظار المسئول</Badge>
  if (session.summary.wrong > 0)    return <Badge variant="danger" dot>{session.summary.wrong} صنف فيه فرق</Badge>
  return <Badge variant="success" dot>مطابق بالكامل</Badge>
}

export function SessionCard({ session, defaultOpen }: Props) {
  const [open,   setOpen]   = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  const link     = buildStockCountLink(session.access_token)
  const waLink   = buildWhatsappLink(session)
  const { summary } = session

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card padding={false}>
      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 text-start min-w-0">
          <ChevronDown size={16} className={cn('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{session.employee_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {session.count_date} · {summary.total} صنف · صح {summary.correct} · غلط {summary.wrong}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge session={session} />
          {session.status === 'pending' && (
            <>
              <Button size="sm" variant="secondary"
                icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void handleCopy()}>
                {copied ? 'تم النسخ' : 'نسخ الرابط'}
              </Button>
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="secondary" icon={<MessageCircle size={14} />}>واتساب</Button>
                </a>
              )}
              <a href={link} target="_blank" rel="noreferrer" aria-label="فتح الرابط">
                <Button size="sm" variant="ghost" icon={<ExternalLink size={14} />} />
              </a>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-2 border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {session.items.map(item => <ItemResultRow key={item.id} item={item} />)}
        </div>
      )}
    </Card>
  )
}
