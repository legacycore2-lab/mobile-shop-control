// src/pages/stock-count/PublicStockCountPage.tsx
// شاشة خارجية بعيدة عن النظام — بتفتح بالرابط (token) من غير تسجيل دخول
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePublicStockCount, useSubmitStockCount } from '@/hooks/useStockCount'
import { friendlyDbError } from '@/lib/errors'
import { canSubmit, summarize } from '@/services/stockCount.service'
import type { AnswerDraft, PublicStockCount } from '@/types/stockCount'
import { AnswerRow } from './AnswerRow'
import { ItemResultRow } from './ItemResultRow'

const EMPTY_DRAFT: AnswerDraft = { isCorrect: null, countedQty: '' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">{children}</div>
    </div>
  )
}

function Notice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
      {icon}
      <p className="text-sm font-semibold text-center">{text}</p>
    </div>
  )
}

function SubmittedView({ session }: { session: PublicStockCount }) {
  const summary = summarize(session.items)
  return (
    <>
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 size={22} className="text-green-600 dark:text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">تم إرسال الجرد، شكراً</p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">صح {summary.correct} · غلط {summary.wrong}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 divide-y divide-gray-100 dark:divide-gray-800">
        {session.items.map(item => <ItemResultRow key={item.id} item={item} />)}
      </div>
    </>
  )
}

function PendingForm({ token, session }: { token: string; session: PublicStockCount }) {
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft>>({})
  const [error,  setError]  = useState<string | null>(null)
  const submit = useSubmitStockCount(token)

  const answered = session.items.filter(i => drafts[i.id]?.isCorrect != null).length
  const ready    = canSubmit(session.items, drafts)

  async function handleSubmit() {
    setError(null)
    try {
      await submit.mutateAsync({ items: session.items, drafts })
    } catch (err) {
      setError(friendlyDbError(err))
    }
  }

  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        علّم كل صنف <span className="font-semibold">صح</span> لو العدد مطابق، أو{' '}
        <span className="font-semibold">غلط</span> واكتب العدد الصحيح.
      </p>

      {session.items.map(item => (
        <AnswerRow key={item.id} item={item} draft={drafts[item.id] ?? EMPTY_DRAFT}
          onChange={d => setDrafts(prev => ({ ...prev, [item.id]: d }))} />
      ))}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 space-y-2">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button variant="primary" size="lg" className="w-full" loading={submit.isPending}
          disabled={!ready} onClick={() => void handleSubmit()}>
          إرسال الجرد ({answered}/{session.items.length})
        </Button>
      </div>
    </>
  )
}

export function PublicStockCountPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { data: session, isLoading, isError } = usePublicStockCount(token)

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <ClipboardCheck size={22} className="text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">جرد اليوم</h1>
          {session && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{session.employee_name} · {session.count_date}</p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && <Notice icon={<LinkIcon size={32} className="opacity-40" />} text="حصلت مشكلة في تحميل الجرد — حاول تاني" />}

      {!isLoading && !isError && !session && (
        <Notice icon={<LinkIcon size={32} className="opacity-40" />} text="الرابط ده غير صحيح أو منتهي" />
      )}

      {session?.status === 'submitted' && <SubmittedView session={session} />}
      {session?.status === 'pending' && <PendingForm token={token} session={session} />}
    </Shell>
  )
}
