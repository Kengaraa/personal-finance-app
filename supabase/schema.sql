-- =====================================================================
-- Ledgerly database schema for Supabase (PostgreSQL)
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query
-- It is safe to re-run: objects are created only if they do not exist.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  currency    text not null default 'USD' check (char_length(currency) = 3),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  type             text not null check (type in ('checking', 'savings', 'credit_card', 'cash', 'investment')),
  initial_balance  numeric(14, 2) not null default 0,
  color            text not null default '#0d9488',
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  type        text not null check (type in ('income', 'expense')),
  color       text not null default '#64748b',
  icon        text not null default 'tag',
  created_at  timestamptz not null default now(),
  unique (user_id, name, type)
);

create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id        uuid not null references public.accounts (id) on delete cascade,
  category_id       uuid references public.categories (id) on delete set null,
  type              text not null check (type in ('income', 'expense')),
  amount            numeric(14, 2) not null check (amount > 0),
  description       text check (description is null or char_length(description) <= 200),
  notes             text check (notes is null or char_length(notes) <= 1000),
  transaction_date  date not null default current_date,
  created_at        timestamptz not null default now()
);

create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  amount       numeric(14, 2) not null check (amount > 0),
  created_at   timestamptz not null default now(),
  unique (user_id, category_id)
);

create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  target_amount   numeric(14, 2) not null check (target_amount > 0),
  current_amount  numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date     date,
  color           text not null default '#0d9488',
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists categories_user_idx on public.categories (user_id);
create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists budgets_user_idx on public.budgets (user_id);
create index if not exists goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------
-- Account balances view (initial balance + income - expenses).
-- security_invoker makes the view respect the caller's row level security.
-- ---------------------------------------------------------------------

create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id, a.initial_balance;

-- ---------------------------------------------------------------------
-- Row level security: every user can only touch their own rows
-- ---------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.goals        enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "accounts_own" on public.accounts;
create policy "accounts_own" on public.accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_own" on public.categories;
create policy "categories_own" on public.categories for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions must also reference an account and category owned by the same user.
drop policy if exists "transactions_own" on public.transactions;
create policy "transactions_own" on public.transactions for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (
      category_id is null
      or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid())
    )
  );

drop policy if exists "budgets_own" on public.budgets;
create policy "budgets_own" on public.budgets for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid())
  );

drop policy if exists "goals_own" on public.goals;
create policy "goals_own" on public.goals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.account_balances to authenticated;

-- ---------------------------------------------------------------------
-- Keep profiles.updated_at fresh
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Seed default categories for a user
-- ---------------------------------------------------------------------

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, color, icon) values
    (p_user_id, 'Groceries',     'expense', '#16a34a', 'cart'),
    (p_user_id, 'Dining out',    'expense', '#f97316', 'food'),
    (p_user_id, 'Housing',       'expense', '#6366f1', 'home'),
    (p_user_id, 'Transport',     'expense', '#0ea5e9', 'car'),
    (p_user_id, 'Health',        'expense', '#ef4444', 'health'),
    (p_user_id, 'Entertainment', 'expense', '#a855f7', 'entertainment'),
    (p_user_id, 'Utilities',     'expense', '#eab308', 'utilities'),
    (p_user_id, 'Shopping',      'expense', '#ec4899', 'shirt'),
    (p_user_id, 'Education',     'expense', '#14b8a6', 'education'),
    (p_user_id, 'Travel',        'expense', '#06b6d4', 'travel'),
    (p_user_id, 'Subscriptions', 'expense', '#8b5cf6', 'phone'),
    (p_user_id, 'Other',         'expense', '#64748b', 'tag'),
    (p_user_id, 'Salary',        'income',  '#16a34a', 'work'),
    (p_user_id, 'Freelance',     'income',  '#0d9488', 'cash'),
    (p_user_id, 'Investments',   'income',  '#2563eb', 'investment'),
    (p_user_id, 'Gifts',         'income',  '#db2777', 'gift'),
    (p_user_id, 'Other income',  'income',  '#64748b', 'tag')
  on conflict (user_id, name, type) do nothing;
end;
$$;

-- Not callable from the API: only the signup trigger (and you, in the SQL editor) can run it.
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- On signup: create the profile and default categories
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- OPTIONAL: if you already created users BEFORE running this file,
-- uncomment and run this block once to give them a profile and categories.
-- ---------------------------------------------------------------------
-- insert into public.profiles (id)
--   select id from auth.users on conflict (id) do nothing;
-- select public.seed_default_categories(id) from auth.users;
