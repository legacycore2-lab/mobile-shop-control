// src/services/importTemplate.service.ts
// تجهيز قالب الاستيراد: القالب الثابت + شيت "قائمة المنتجات" متعبّي بمنتجات النظام الحالية
// (المعادلات في شيت المنتجات بتجيب الاسم والفئة والنوع من الكود)
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { importRepository } from '@/repositories/import.repository'
import type { ProductReference } from '@/repositories/import.repository'
import type { ProductType } from '@/types/database'

const TEMPLATE_URL         = `${import.meta.env.BASE_URL}import-template.xlsx`
const REFERENCE_SHEET_PATH = 'xl/worksheets/sheet4.xml'
const REFERENCE_COLUMNS    = 'ABCD'
const XLSX_MIME            = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  accessory:  'إكسسوار',
  spare_part: 'قطعة غيار',
}

function isValidXmlChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code === 9 || code === 10 || code === 13 || code >= 32
}

function escapeXml(text: string): string {
  return Array.from(text).filter(isValidXmlChar).join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function referenceRows(refs: ProductReference[]): string {
  return refs.map((ref, i) => {
    const rowNum = i + 2
    const values = [ref.sku, ref.name, ref.category_name, PRODUCT_TYPE_LABEL[ref.category_type]]
    const cells  = values.map((v, c) =>
      `<c r="${REFERENCE_COLUMNS[c]}${rowNum}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`)
    return `<row r="${rowNum}">${cells.join('')}</row>`
  }).join('')
}

function injectReference(sheetXml: string, refs: ProductReference[]): string {
  if (!sheetXml.includes('</sheetData>')) {
    throw new Error('ملف القالب تالف — ارفع نسخة سليمة من القالب للمشروع')
  }
  // دالة بدل نص: أسماء المنتجات ممكن تحتوي على علامة $
  return sheetXml
    .replace('</sheetData>', () => `${referenceRows(refs)}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, () => `<dimension ref="A1:D${refs.length + 1}"/>`)
}

export const importTemplateService = {

  build: async (): Promise<Blob> => {
    const [response, refs] = await Promise.all([
      fetch(TEMPLATE_URL),
      importRepository.getProductReferences(),
    ])
    if (!response.ok) throw new Error('تعذّر تحميل ملف القالب')

    const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
    const sheet = files[REFERENCE_SHEET_PATH]
    if (!sheet) throw new Error('ملف القالب تالف — ارفع نسخة سليمة من القالب للمشروع')

    files[REFERENCE_SHEET_PATH] = strToU8(injectReference(strFromU8(sheet), refs))
    return new Blob([zipSync(files).slice()], { type: XLSX_MIME })
  },
}
