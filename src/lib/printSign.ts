// src/lib/printSign.ts — لافتة جهاز للطباعة (A4 عرضي): لوجو المحل + بيانات بتتكتب بإيد المستخدم
export interface SignData {
  name:      string          // اسم الجهاز
  spec:      string          // النوع / السعة (مثلاً 4/128 GB)
  condition: string          // الحالة (مثلاً كسر زيرو)
  battery:   number | null   // نسبة البطارية — اختيارية
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// الاسم الطويل بيصغّر عشان يفضل في سطر واحد
function nameSizeMm(name: string): number {
  if (name.length <= 14) return 34
  if (name.length <= 20) return 26
  if (name.length <= 28) return 19
  return 14
}

function batteryBox(percent: number): string {
  const pct  = Math.max(0, Math.min(100, Math.round(percent)))
  const fill = Math.round((pct / 100) * 14)
  return `<div class="box ltr"><svg viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg">`
    + `<rect x="0.5" y="0.5" width="16" height="9" rx="1.5" fill="none" stroke="#000" stroke-width="1"/>`
    + `<rect x="17" y="3" width="2.5" height="4" fill="#000"/>`
    + `<rect x="2" y="2" width="${fill}" height="6" fill="#000"/></svg>${pct}%</div>`
}

export function buildSignHtml(data: SignData, logoUrl: string, autoPrint: boolean): string {
  const name = data.name.trim()
  const spec = data.spec.trim()
  const cond = data.condition.trim()
  const boxList = [
    spec ? `<div class="box ltr">${escapeHtml(spec)}</div>` : '',
    cond ? `<div class="box">${escapeHtml(cond)}</div>` : '',
    data.battery != null ? batteryBox(data.battery) : '',
  ].filter(Boolean)
  const boxes = boxList.join('')
  const boxFontMm = boxList.length >= 3 ? 15 : 20   // التلات خانات بيصغروا عشان يتساعوا في سطر واحد

  return `<!DOCTYPE html><html dir="rtl"><head>
  <meta charset="UTF-8">
  <title>لافتة جهاز</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: A4 landscape; margin: 0; }
    html, body { width: 297mm; height: 210mm; background: #fff; font-family: Tahoma, Arial, sans-serif; }
    .sheet { width: 297mm; height: 210mm; display: flex; flex-direction: column; align-items: center;
             justify-content: space-between; padding: 10mm 14mm 12mm; overflow: hidden; }
    .logo { height: 84mm; max-width: 100%; object-fit: contain; }
    .name { font: italic 800 ${nameSizeMm(name)}mm/1.1 Arial, sans-serif; direction: ltr; text-align: center;
            max-width: 100%; white-space: nowrap; overflow: hidden; }
    .row { display: flex; gap: 8mm; width: 100%; justify-content: center; align-items: stretch; }
    .box { border: 1.2mm solid #000; border-radius: 4mm; padding: 3mm 7mm; font: 800 ${boxFontMm}mm/1.15 Arial, Tahoma, sans-serif;
           text-align: center; display: flex; align-items: center; gap: 4mm; white-space: nowrap; }
    .box.ltr { direction: ltr; }
    .box svg { width: ${Math.round(boxFontMm * 1.5)}mm; height: ${Math.round(boxFontMm * 0.75)}mm; }
  </style>
  </head><body>
  <div class="sheet">
    <img class="logo" src="${escapeHtml(logoUrl)}" alt="">
    <div class="name">${escapeHtml(name)}</div>
    <div class="row">${boxes}</div>
  </div>
  ${autoPrint ? '<script>window.onload=function(){window.print()};<\/script>' : ''}
  </body></html>`
}

export function printSign(data: SignData): void {
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}brand/elshafei-logo.png`
  const win = window.open('', '_blank')
  if (win) { win.document.write(buildSignHtml(data, logoUrl, true)); win.document.close() }
}
