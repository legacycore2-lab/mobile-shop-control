// src/pages/import/constants.ts
export const TEMPLATE_FILE_NAME = 'mobile_shop_import_template.xlsx'

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
