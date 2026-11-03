-- =====================================================================
-- Ledgerly admin support. Run AFTER schema.sql, in the Supabase SQL Editor.
-- Safe to re-run.
--
-- Admins can see aggregate app statistics and a user list (email, name,
-- sign-up date, last sign-in, record counts). They cannot read anyone's
-- transactions, balances or other financial details: row level security
-- is unchanged and the admin functions only return counts and totals.
-- =====================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Users must not be able to promote themselves. Limit which profile columns
-- the API roles may write, so is_admin can only be changed from the SQL Editor
-- (or with the service role).
revoke insert, update on public.profiles from authenticated;
grant insert (id, full_name, currency) on public.profiles to authenticated;
grant update (full_name, currency) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Dashboard statistics (one JSON document)
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users',            (select count(*) from auth.users),
      'new_users_30d',    (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'active_users_30d', (select count(distinct user_id) from public.transactions where created_at > now() - interval '30 days'),
      'accounts',         (select count(*) from public.accounts),
      'transactions',     (select count(*) from public.transactions),
      'budgets',          (select count(*) from public.budgets),
      'goals',            (select count(*) from public.goals),
      'categories',       (select count(*) from public.categories),
      'admins',           (select count(*) from public.profiles where is_admin)
    ),
    'signups_by_month', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.month), '[]'::jsonb)
      from (
        select to_char(m, 'YYYY-MM') as month,
               (select count(*) from auth.users u where date_trunc('month', u.created_at) = m) as users
        from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      ) s
    ),
    'transactions_by_month', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.month), '[]'::jsonb)
      from (
        select to_char(m, 'YYYY-MM') as month,
               (select count(*) from public.transactions t where date_trunc('month', t.transaction_date) = m and t.type = 'income')  as income,
               (select count(*) from public.transactions t where date_trunc('month', t.transaction_date) = m and t.type = 'expense') as expense
        from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      ) s
    ),
    'accounts_by_type', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.accounts desc), '[]'::jsonb)
      from (select type, count(*) as accounts from public.accounts group by type) s
    ),
    'top_categories', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.transactions desc), '[]'::jsonb)
      from (
        select c.name, c.type, count(t.id) as transactions
        from public.transactions t
        join public.categories c on c.id = t.category_id
        group by c.name, c.type
        order by count(t.id) desc
        limit 8
      ) s
    ),
    'volume_by_currency', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.transactions desc), '[]'::jsonb)
      from (
        select p.currency,
               count(t.id) as transactions,
               coalesce(sum(t.amount) filter (where t.type = 'income'), 0)  as income,
               coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense
        from public.transactions t
        join public.profiles p on p.id = t.user_id
        group by p.currency
      ) s
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Paged user list
-- ---------------------------------------------------------------------
create or replace function public.admin_users(
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  currency text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  accounts_count bigint,
  transactions_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.full_name,
    p.currency,
    coalesce(p.is_admin, false),
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.accounts a where a.user_id = u.id),
    (select count(*) from public.transactions t where t.user_id = u.id),
    count(*) over()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p_search is null
     or p_search = ''
     or u.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by u.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

-- Only signed-in users may call these, and each one re-checks is_admin().
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_users(text, integer, integer) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_users(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Make someone an admin: replace the email, uncomment, and run.
-- They must have signed up in the app first. They may need to refresh the page.
-- ---------------------------------------------------------------------
-- update public.profiles
--    set is_admin = true
--  where id = (select id from auth.users where email = 'you@example.com');

-- To remove admin access:
-- update public.profiles set is_admin = false
--  where id = (select id from auth.users where email = 'you@example.com');
