// src/pages/import/constants.ts
import type { ImportKind } from '@/services/import.service'

// أقصى عدد صفوف بنعرضها في المعاينة — الاستيراد نفسه بيشمل كل الصفوف الصحيحة
export const PREVIEW_LIMIT = 300

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  accessory:  'إكسسوار',
  spare_part: 'قطعة غيار',
}

export const CONDITION_LABELS: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

interface KindMeta {
  tabLabel:      string
  templateLabel: string
  templateFile:  string
  title:         string
  unit:          string
  sheetName:     string
  instructions:  string[]
}

export const KIND_META: Record<ImportKind, KindMeta> = {
  products: {
    tabLabel:      'المنتجات والإكسسوارات',
    templateLabel: 'تحميل قالب المنتجات',
    templateFile:  'mobile_shop_products_template.xlsx',
    title:         'المنتجات والإكسسوارات',
    unit:          'منتج',
    sheetName:     'منتجات وإكسسوارات',
    instructions: [
      'حمّل قالب المنتجات من الزر الأخضر في الأعلى (بيتجهّز بمنتجاتك الحالية)',
      'اكتب بياناتك في شيت "منتجات وإكسسوارات" من الصف 5',
      'منتج موجود: اكتب كوده في أول عمود وهيظهر اسمه وفئته تلقائي — راجعه قبل ما تكمّل. منتج جديد: سيب الكود فاضي واكتب الاسم بإيدك',
      'احفظ الملف بصيغة .xlsx وارفعه هنا — النظام هيعرض معاينة قبل الحفظ',
    ],
  },
  devices: {
    tabLabel:      'الأجهزة',
    templateLabel: 'تحميل قالب الأجهزة',
    templateFile:  'mobile_shop_devices_template.xlsx',
    title:         'الأجهزة',
    unit:          'جهاز',
    sheetName:     'أجهزة موبايل',
    instructions: [
      'حمّل قالب الأجهزة من الزر الأخضر في الأعلى',
      'اكتب بياناتك في شيت "أجهزة موبايل" من الصف 5 — IMEI لازم 15 رقم وماينفعش يتكرر',
      'كل جهاز بيتسجل بفاتورة شراء مستقلة على المورد "بدون" بسعر التكلفة',
      'احفظ الملف بصيغة .xlsx وارفعه هنا — النظام هيعرض معاينة قبل الحفظ',
    ],
  },
}
