-- ============================================================
-- Migration 005: Expenses (المصروفات)
-- ============================================================

-- ── Categories ────────────────────────────────────────────────
create table if not exists public.expense_categories (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

-- Default categories
insert into public.expense_categories (name) values
  ('إيجار'),
  ('كهرباء'),
  ('مياه'),
  ('رواتب'),
  ('صيانة'),
  ('مواصلات'),
  ('تسويق'),
  ('أخرى')
on conflict (name) do nothing;

-- ── Expenses Table ────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid          primary key default uuid_generate_v4(),
  category_id uuid          references public.expense_categories(id),
  amount      numeric(12,2) not null check (amount > 0),
  description text,
  expense_date date         not null default current_date,
  payment_method text       not null default 'cash'
                   check (payment_method in ('cash','bank_transfer','check','other')),
  reference_number text,
  notes       text,
  created_by  uuid          references public.profiles(id),
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index if not exists expenses_date_idx     on public.expenses(expense_date);
create index if not exists expenses_category_idx on public.expenses(category_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;

drop policy if exists "expense_categories_all" on public.expense_categories;
create policy "expense_categories_all" on public.expense_categories
  for all using (auth.uid() is not null);

drop policy if exists "expenses_all" on public.expenses;
create policy "expenses_all" on public.expenses
  for all using (auth.uid() is not null);

-- ── updated_at trigger ────────────────────────────────────────
create or replace function public.trg_set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end;
$$;

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.trg_set_updated_at();

-- ── Grants ────────────────────────────────────────────────────
grant all on public.expense_categories to authenticated;
grant all on public.expenses           to authenticated;
