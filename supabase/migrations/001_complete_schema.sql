-- ============================================================
-- Mobile Shop Control System — Complete SQL Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. PURCHASE INVOICES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_date   DATE NOT NULL,
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','cancelled')),
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_invoice_devices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  device_id  UUID NOT NULL REFERENCES mobile_devices(id) ON DELETE RESTRICT,
  cost_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS purchase_invoice_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal   NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. SALE INVOICES ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sale_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_date   DATE NOT NULL,
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','cancelled')),
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_invoice_devices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           UUID NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
  device_id            UUID NOT NULL REFERENCES mobile_devices(id) ON DELETE RESTRICT,
  actual_selling_price NUMERIC(12,2) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS sale_invoice_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal   NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. updated_at triggers ───────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_invoices_updated ON purchase_invoices;
CREATE TRIGGER trg_purchase_invoices_updated
  BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sale_invoices_updated ON sale_invoices;
CREATE TRIGGER trg_sale_invoices_updated
  BEFORE UPDATE ON sale_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. RPC: next_purchase_invoice_number ─────────────────────

CREATE OR REPLACE FUNCTION next_purchase_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  last_num  INTEGER;
  new_num   TEXT;
  yr        TEXT := to_char(now(), 'YY');
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '\D','','g'), '') AS INTEGER)
  ), 0)
  INTO last_num
  FROM purchase_invoices
  WHERE invoice_number LIKE 'PUR-' || yr || '-%';

  new_num := 'PUR-' || yr || '-' || LPAD((last_num + 1)::TEXT, 4, '0');
  RETURN new_num;
END;
$$;

-- ── 5. RPC: next_sale_invoice_number ─────────────────────────

CREATE OR REPLACE FUNCTION next_sale_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  last_num  INTEGER;
  new_num   TEXT;
  yr        TEXT := to_char(now(), 'YY');
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '\D','','g'), '') AS INTEGER)
  ), 0)
  INTO last_num
  FROM sale_invoices
  WHERE invoice_number LIKE 'SAL-' || yr || '-%';

  new_num := 'SAL-' || yr || '-' || LPAD((last_num + 1)::TEXT, 4, '0');
  RETURN new_num;
END;
$$;

-- ── 6. RPC: lookup_device_by_imei (ensure exists) ────────────

CREATE OR REPLACE FUNCTION lookup_device_by_imei(p_imei TEXT)
RETURNS TABLE (
  id UUID, imei1 TEXT, imei2 TEXT, serial_number TEXT,
  model_id UUID, storage TEXT, color TEXT, condition TEXT,
  supplier_id UUID, purchase_invoice_id UUID,
  purchase_date DATE, cost_price NUMERIC, selling_price NUMERIC,
  actual_selling_price NUMERIC, sold_to_customer_id UUID,
  sale_invoice_id UUID, sold_at TIMESTAMPTZ,
  warranty_months INTEGER, warranty_expires_at TIMESTAMPTZ,
  status TEXT, location TEXT, notes TEXT,
  added_by UUID, sold_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  brand_name TEXT, model_name TEXT, supplier_name TEXT,
  customer_name TEXT, customer_phone TEXT,
  added_by_name TEXT, sold_by_name TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    d.id, d.imei1, d.imei2, d.serial_number,
    d.model_id, d.storage, d.color, d.condition,
    d.supplier_id, d.purchase_invoice_id,
    d.purchase_date, d.cost_price, d.selling_price,
    d.actual_selling_price, d.sold_to_customer_id,
    d.sale_invoice_id, d.sold_at,
    d.warranty_months, d.warranty_expires_at,
    d.status, d.location, d.notes,
    d.added_by, d.sold_by, d.created_at, d.updated_at,
    mb.name  AS brand_name,
    mm.name  AS model_name,
    s.name   AS supplier_name,
    c.name   AS customer_name,
    c.phone  AS customer_phone,
    pa.full_name AS added_by_name,
    ps.full_name AS sold_by_name
  FROM mobile_devices d
  JOIN mobile_models  mm ON mm.id = d.model_id
  JOIN mobile_brands  mb ON mb.id = mm.brand_id
  JOIN suppliers      s  ON s.id  = d.supplier_id
  LEFT JOIN customers c  ON c.id  = d.sold_to_customer_id
  LEFT JOIN profiles  pa ON pa.id = d.added_by
  LEFT JOIN profiles  ps ON ps.id = d.sold_by
  WHERE d.imei1 = p_imei OR d.imei2 = p_imei;
$$;

-- ── 7. RPC: get_low_stock_products (ensure exists) ───────────

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  product_id    UUID,
  product_name  TEXT,
  stock_qty     INTEGER,
  reorder_level INTEGER,
  category_name TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id           AS product_id,
    p.name         AS product_name,
    p.stock_qty,
    p.reorder_level,
    pc.name        AS category_name
  FROM products p
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE p.is_active = true
    AND p.stock_qty <= p.reorder_level
  ORDER BY p.stock_qty ASC;
$$;

-- ── 8. Row Level Security ─────────────────────────────────────

ALTER TABLE purchase_invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_invoice_devices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_invoice_products     ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust per role if needed)
CREATE POLICY "auth_all" ON purchase_invoices         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON purchase_invoice_devices  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON purchase_invoice_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON sale_invoices             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON sale_invoice_devices      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON sale_invoice_products     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 9. Indexes for performance ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier  ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status    ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date      ON purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_customer      ON sale_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_status        ON sale_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_date          ON sale_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_imei1        ON mobile_devices(imei1);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_status       ON mobile_devices(status);
