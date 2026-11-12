-- Planned database schema for when we move from browser storage to Supabase.
-- Not used yet: the app currently stores data in localStorage.
--
-- Each row belongs to one user (auth.users). Row Level Security makes sure a
-- signed-in user can only ever read or change their own transactions, so
-- friends can have their own accounts on the same app.

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  amount_cents integer not null check (amount_cents > 0),
  merchant     text not null,
  category     text not null,
  card         text not null default '',
  date         date not null,
  note         text not null default '',
  source       text not null default 'manual' check (source in ('manual', 'shortcut')),
  created_at   timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);

alter table public.transactions enable row level security;

create policy "Users read own transactions"
  on public.transactions for select using (auth.uid() = user_id);

create policy "Users insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);

create policy "Users update own transactions"
  on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);
