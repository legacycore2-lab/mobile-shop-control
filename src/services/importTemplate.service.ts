// src/services/importTemplate.service.ts
// تجهيز قالب الاستيراد: قالب الأجهزة زي ما هو، وقالب المنتجات + شيت "قائمة المنتجات" متعبّي بمنتجات النظام
// الحالية (المعادلات في شيت المنتجات بتجيب الاسم والفئة والنوع من الكود)
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { importRepository } from '@/repositories/import.repository'
import type { ProductReference } from '@/repositories/import.repository'
import type { ImportKind } from '@/services/import.service'
import type { ProductType } from '@/types/database'

const TEMPLATE_URL: Record<ImportKind, string> = {
  products: `${import.meta.env.BASE_URL}import-template-products.xlsx`,
  devices:  `${import.meta.env.BASE_URL}import-template-devices.xlsx`,
}
const REFERENCE_SHEET_PATH = 'xl/worksheets/sheet3.xml'
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

async function fetchTemplate(kind: ImportKind): Promise<Uint8Array> {
  const response = await fetch(TEMPLATE_URL[kind])
  if (!response.ok) throw new Error('تعذّر تحميل ملف القالب')
  return new Uint8Array(await response.arrayBuffer())
}

function toXlsxBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes.slice()], { type: XLSX_MIME })
}

export const importTemplateService = {

  build: async (kind: ImportKind): Promise<Blob> => {
    if (kind === 'devices') return toXlsxBlob(await fetchTemplate('devices'))

    const [template, refs] = await Promise.all([
      fetchTemplate('products'),
      importRepository.getProductReferences(),
    ])

    const files = unzipSync(template)
    const sheet = files[REFERENCE_SHEET_PATH]
    if (!sheet) throw new Error('ملف القالب تالف — ارفع نسخة سليمة من القالب للمشروع')

    files[REFERENCE_SHEET_PATH] = strToU8(injectReference(strFromU8(sheet), refs))
    return toXlsxBlob(zipSync(files))
  },
}
