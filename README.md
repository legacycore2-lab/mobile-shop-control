# Mobile Shop Control System

نظام ERP متكامل لإدارة محلات الموبايل — React + TypeScript + Supabase

## 🚀 Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS v4
- **State**: TanStack Query + React Context
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Deploy**: GitHub Pages

---

## ✅ المميزات

| الوحدة | الحالة |
|--------|--------|
| 🔐 Auth (Login + Dark Mode) | ✅ مكتمل |
| 📱 الأجهزة (IMEI Tracking) | ✅ مكتمل |
| 🛒 نقطة البيع (POS) | ✅ مكتمل |
| 📦 المشتريات (Purchases) | ✅ مكتمل |
| 🏷️ المنتجات والفئات | ✅ مكتمل |
| 🚚 الموردين | ✅ مكتمل |
| 👥 العملاء | ✅ مكتمل |
| 📊 التقارير | ✅ مكتمل |
| 🛡️ سجل العمليات | ✅ مكتمل |
| ⚙️ الإعدادات | ✅ مكتمل |
| 📤 تصدير CSV | ✅ مكتمل |
| 🌙 Dark Mode | ✅ مكتمل |

---

## ⚙️ إعداد Supabase (مطلوب مرة واحدة)

### 1. شغّل الـ SQL Migration
افتح [Supabase SQL Editor](https://supabase.com/dashboard/project/hgonjisrduahawrmglmd/sql) وانسخ والصق محتوى:

```
supabase/migrations/001_complete_schema.sql
```

هذا الملف ينشئ:
- جداول الفواتير: `purchase_invoices`, `purchase_invoice_devices`, `purchase_invoice_products`
- جداول المبيعات: `sale_invoices`, `sale_invoice_devices`, `sale_invoice_products`
- Functions: `next_purchase_invoice_number`, `next_sale_invoice_number`, `lookup_device_by_imei`, `get_low_stock_products`
- Indexes للأداء
- Row Level Security

### 2. أضف الـ Secrets في GitHub
في إعدادات الريبو → Secrets → Actions:
- `VITE_SUPABASE_URL` = `https://hgonjisrduahawrmglmd.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (من Supabase Dashboard → API)

### 3. أنشئ ملف `.env.local`
```env
VITE_SUPABASE_URL=https://hgonjisrduahawrmglmd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🏗️ Architecture

```
src/
├── pages/          ← UI فقط
├── hooks/          ← TanStack Query
├── services/       ← Business Logic
├── repositories/   ← SQL queries فقط
├── components/ui/  ← Shared components
├── types/          ← TypeScript types
└── lib/            ← supabase + auth + theme + exportUtils
```

---

## 🚦 التشغيل المحلي

```bash
git clone https://github.com/legacycore2-lab/mobile-shop-control
cd mobile-shop-control
npm install
cp .env.example .env.local   # ثم أضف الـ keys
npm run dev
```

---

## 📤 التصدير

كل صفحة بها زرار "تصدير CSV" يدعم العربية (BOM encoding) ويفتح مباشرة في Excel.

