-- ============================================================
--  AJOUTS SQL — Heures de ménage + Notifications
--  À coller dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. SESSIONS D'HEURES (saisie manuelle après passage)
create table if not exists heures_sessions (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  passage_id uuid references passages(id) on delete set null,
  duree_minutes int not null,         -- durée en minutes (ex: 150 = 2h30)
  date_session date not null default current_date,
  note text default '',
  created_at timestamptz default now()
);

-- 2. PÉRIODES DE PAIEMENT (archivage quand payée)
create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  date_paiement date not null default current_date,
  total_minutes int not null,
  periode_debut date not null,
  periode_fin date not null,
  note text default '',
  created_at timestamptz default now()
);

-- 3. ABONNEMENTS PUSH (pour les notifications navigateur)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- RLS
alter table heures_sessions enable row level security;
alter table paiements enable row level security;
alter table push_subscriptions enable row level security;

create policy "public_all" on heures_sessions for all using (true) with check (true);
create policy "public_all" on paiements for all using (true) with check (true);
create policy "public_all" on push_subscriptions for all using (true) with check (true);
