// src/lib/xlsxWriter.ts
// كاتب ملفات Excel (.xlsx) حقيقية: النصوص بتفضل نصوص (IMEI والهاتف والرقم القومي)،
// والأرقام والتواريخ بتتحفظ بقيمتها الأصلية مع تنسيق، والشيت من اليمين لليسار.
import { strToU8, zipSync } from 'fflate'

export type XlsxColumnKind = 'text' | 'number' | 'currency' | 'date'
export type XlsxValue      = string | number | null

export interface XlsxColumn {
  header: string
  kind:   XlsxColumnKind
  width?: number
}

export interface XlsxSheet {
  name:     string
  title?:   string | null
  columns:  XlsxColumn[]
  rows:     XlsxValue[][]
}

// ── Styles (فهارس cellXfs في styles.xml) ──────────────────────────────────────
const STYLE_TITLE    = 1
const STYLE_HEADER   = 2
const STYLE_TEXT     = 3
const STYLE_NUMBER   = 4
const STYLE_CURRENCY = 5
const STYLE_DATE     = 6

const NUMFMT_DATE_ID = 164

const MIN_WIDTH = 8
const MAX_WIDTH = 45

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

// ── XML helpers ───────────────────────────────────────────────────────────────

function isXmlSafe(code: number): boolean {
  return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 0xFFFE && code !== 0xFFFF && !(code >= 0xD800 && code <= 0xDFFF))
}

function escapeXml(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code > 0xFFFF || isXmlSafe(code)) out += ch
  }
  return out
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function sanitizeSheetName(name: string): string {
  const clean = name.replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim()
  return (clean || 'Sheet1').slice(0, 31)
}

// ── Cells ─────────────────────────────────────────────────────────────────────

function excelDateSerial(iso: string): number | null {
  const m = ISO_DATE.exec(iso)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ms = Date.UTC(y, mo - 1, d)
  const back = new Date(ms)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return Math.round((ms - Date.UTC(1899, 11, 30)) / 86_400_000)
}

function textCell(ref: string, value: string, style: number): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function numberCell(ref: string, value: number, style: number): string {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
}

function emptyCell(ref: string, style: number): string {
  return `<c r="${ref}" s="${style}"/>`
}

function dataCell(ref: string, value: XlsxValue, kind: XlsxColumnKind): string {
  const numericStyle = kind === 'currency' ? STYLE_CURRENCY : STYLE_NUMBER

  if (value === null || value === '') {
    return emptyCell(ref, kind === 'date' ? STYLE_DATE : kind === 'text' ? STYLE_TEXT : numericStyle)
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? numberCell(ref, value, numericStyle) : emptyCell(ref, numericStyle)
  }
  if (kind === 'date') {
    const serial = excelDateSerial(value)
    if (serial !== null) return numberCell(ref, serial, STYLE_DATE)
  }
  return textCell(ref, value, STYLE_TEXT)
}

// ── Layout ────────────────────────────────────────────────────────────────────

function cellLength(value: XlsxValue): number {
  if (value === null) return 0
  return String(value).length
}

function columnWidth(column: XlsxColumn, index: number, rows: XlsxValue[][]): number {
  if (column.width) return column.width
  let longest = column.header.length
  for (const row of rows) longest = Math.max(longest, cellLength(row[index] ?? null))
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(longest * 1.15 + 3)))
}

function buildSheetXml(sheet: XlsxSheet): { xml: string; headerRow: number; lastRow: number } {
  const { columns, rows } = sheet
  const hasTitle  = Boolean(sheet.title)
  const headerRow = hasTitle ? 2 : 1
  const lastRow   = headerRow + Math.max(rows.length, 1)
  const lastCol   = columnLetter(columns.length - 1)

  const xmlRows: string[] = []

  if (sheet.title) {
    xmlRows.push(`<row r="1">${textCell('A1', sheet.title, STYLE_TITLE)}</row>`)
  }

  const headerCells = columns.map((c, i) => textCell(`${columnLetter(i)}${headerRow}`, c.header, STYLE_HEADER)).join('')
  xmlRows.push(`<row r="${headerRow}" ht="24" customHeight="1">${headerCells}</row>`)

  rows.forEach((row, ri) => {
    const rowNum = headerRow + 1 + ri
    const cells  = columns.map((c, ci) => dataCell(`${columnLetter(ci)}${rowNum}`, row[ci] ?? null, c.kind)).join('')
    xmlRows.push(`<row r="${rowNum}">${cells}</row>`)
  })

  const cols = columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${columnWidth(c, i, rows)}" customWidth="1"/>`)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headerRow + 1}" sqref="A${headerRow + 1}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${xmlRows.join('')}</sheetData>
<autoFilter ref="A${headerRow}:${lastCol}${lastRow}"/>
<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`

  return { xml, headerRow, lastRow }
}

// ── Static parts ──────────────────────────────────────────────────────────────

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

// 0 افتراضي · 1 عنوان · 2 رأس الجدول · 3 نص (@) · 4 رقم · 5 مبلغ (#,##0.00) · 6 تاريخ
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="${NUMFMT_DATE_ID}" formatCode="yyyy\\-mm\\-dd"/></numFmts>
<fonts count="3">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="13"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="${NUMFMT_DATE_ID}" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function workbookXml(sheetName: string, headerRow: number, lastRow: number, lastCol: string): string {
  const quoted = `'${sheetName.replace(/'/g, "''")}'`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(quoted)}!$A$${headerRow}:$${lastCol}$${lastRow}</definedName></definedNames>
</workbook>`
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  if (sheet.columns.length === 0) throw new Error('لا توجد أعمدة للتصدير')

  const name = sanitizeSheetName(sheet.name)
  const { xml, headerRow, lastRow } = buildSheetXml(sheet)
  const lastCol = columnLetter(sheet.columns.length - 1)

  return zipSync({
    '[Content_Types].xml':        strToU8(CONTENT_TYPES),
    '_rels/.rels':                strToU8(ROOT_RELS),
    'xl/workbook.xml':            strToU8(workbookXml(name, headerRow, lastRow, lastCol)),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS),
    'xl/styles.xml':              strToU8(STYLES),
    'xl/worksheets/sheet1.xml':   strToU8(xml),
  })
}
