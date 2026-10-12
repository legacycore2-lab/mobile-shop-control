// src/lib/relativeTime.ts
// وقت نسبي بالعربي بأرقام غربية (متوافق مع باقي النظام)

function clock(d: Date): string {
  const h24    = d.getHours()
  const h12    = h24 % 12 === 0 ? 12 : h24 % 12
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${h12}:${minute} ${h24 < 12 ? 'ص' : 'م'}`
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function formatRelativeAr(iso: string, now: Date): string {
  const then    = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)

  if (minutes < 1) return 'الآن'
  if (minutes < 60) {
    if (minutes === 1)  return 'منذ دقيقة'
    if (minutes === 2)  return 'منذ دقيقتين'
    if (minutes <= 10)  return `منذ ${minutes} دقائق`
    return `منذ ${minutes} دقيقة`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 6) {
    if (hours === 1) return 'منذ ساعة'
    if (hours === 2) return 'منذ ساعتين'
    return `منذ ${hours} ساعات`
  }

  const dayDiff = Math.round((dayStart(now) - dayStart(then)) / 86_400_000)
  if (dayDiff <= 0) return clock(then)
  if (dayDiff === 1) return `أمس ${clock(then)}`
  return `${then.getDate()}/${then.getMonth() + 1}`
}
