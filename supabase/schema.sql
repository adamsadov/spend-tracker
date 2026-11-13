-- Ledger database schema.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Every row belongs to one user (auth.users). Row Level Security makes sure a
-- signed-in user can only ever read or change their own rows, so friends can
-- have their own accounts on the same app.

-- ---------- Transactions ----------

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  merchant     text not null,
  category     text not null,
  card         text not null default '',
  date         date not null,
  note         text not null default '',
  source       text not null default 'manual' check (source in ('manual', 'shortcut')),
  created_at   timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

drop policy if exists "Users read own transactions" on public.transactions;
create policy "Users read own transactions"
  on public.transactions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own transactions" on public.transactions;
create policy "Users insert own transactions"
  on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own transactions" on public.transactions;
create policy "Users update own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own transactions" on public.transactions;
create policy "Users delete own transactions"
  on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Saved cards ----------

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- One card per name per user (case-insensitive).
create unique index if not exists cards_user_name_idx on public.cards (user_id, lower(name));

alter table public.cards enable row level security;

drop policy if exists "Users read own cards" on public.cards;
create policy "Users read own cards"
  on public.cards for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own cards" on public.cards;
create policy "Users insert own cards"
  on public.cards for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own cards" on public.cards;
create policy "Users update own cards"
  on public.cards for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own cards" on public.cards;
create policy "Users delete own cards"
  on public.cards for delete to authenticated using ((select auth.uid()) = user_id);

-- Signed-in users can use these tables (RLS above still limits them to their own rows).
grant select, insert, update, delete on public.transactions, public.cards to authenticated;
