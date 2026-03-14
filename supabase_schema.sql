-- ============================================================
--  SCRIPT SQL — Gestion Gîtes
--  À coller dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. GÎTES
create table if not exists gites (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  notes text default '',
  created_at timestamptz default now()
);

-- 2. TÂCHES (par gîte, importées depuis Excel)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  zone text not null,
  element text not null,
  tache text not null,
  freq int not null default 1,
  ordre int default 0,
  last_done_passage int default 0,
  created_at timestamptz default now()
);

-- 3. PASSAGES
create table if not exists passages (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  numero int not null,
  date_passage timestamptz default now(),
  notes text default '',
  cloture boolean default false
);

-- 4. LOGS DE TÂCHES (quelles tâches faites à quel passage)
create table if not exists task_logs (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  passage_numero int not null,
  done boolean default false,
  done_at timestamptz
);

-- 5. RÉSERVATIONS
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  nom_locataire text not null,
  date_arrivee date not null,
  date_depart date not null,
  nb_personnes int default 2,
  statut text default 'confirme', -- confirme | en_attente | annule
  notes text default '',
  created_at timestamptz default now()
);

-- 6. STOCKS
create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  gite_id uuid references gites(id) on delete cascade,
  categorie text not null, -- 'linge' | 'produits' | 'accueil'
  nom text not null,
  emoji text default '📦',
  quantite int default 0,
  seuil_alerte int default 2,
  created_at timestamptz default now()
);

-- ============================================================
--  RLS (Row Level Security) — accès public lecture/écriture
--  (adapte selon tes besoins d'auth plus tard)
-- ============================================================
alter table gites enable row level security;
alter table tasks enable row level security;
alter table passages enable row level security;
alter table task_logs enable row level security;
alter table reservations enable row level security;
alter table stocks enable row level security;

create policy "public_all" on gites for all using (true) with check (true);
create policy "public_all" on tasks for all using (true) with check (true);
create policy "public_all" on passages for all using (true) with check (true);
create policy "public_all" on task_logs for all using (true) with check (true);
create policy "public_all" on reservations for all using (true) with check (true);
create policy "public_all" on stocks for all using (true) with check (true);

-- ============================================================
--  DONNÉES DE DÉPART — Gîte du Passeur + ses stocks de base
-- ============================================================
insert into gites (id, nom) values
  ('00000000-0000-0000-0000-000000000001', 'Gîte du Passeur');

insert into stocks (gite_id, categorie, nom, emoji, quantite, seuil_alerte) values
  ('00000000-0000-0000-0000-000000000001', 'linge',    'Draps 2 personnes',   '🛏️', 6, 4),
  ('00000000-0000-0000-0000-000000000001', 'linge',    'Draps 1 personne',    '🛏️', 4, 4),
  ('00000000-0000-0000-0000-000000000001', 'linge',    'Serviettes de bain',  '🛁', 8, 6),
  ('00000000-0000-0000-0000-000000000001', 'linge',    'Serviettes mains',    '🧦', 6, 4),
  ('00000000-0000-0000-0000-000000000001', 'linge',    'Housses de couette',  '🤍', 3, 2),
  ('00000000-0000-0000-0000-000000000001', 'produits', 'Liquide vaisselle',   '🧴', 2, 2),
  ('00000000-0000-0000-0000-000000000001', 'produits', 'Nettoyant WC',        '🫧', 1, 2),
  ('00000000-0000-0000-0000-000000000001', 'produits', 'Produit vitres',      '✨', 2, 1),
  ('00000000-0000-0000-0000-000000000001', 'produits', 'Désinfectant',        '🧹', 1, 1),
  ('00000000-0000-0000-0000-000000000001', 'accueil',  'Savonnette accueil',  '🧼', 8, 4),
  ('00000000-0000-0000-0000-000000000001', 'accueil',  'Gel douche',          '🧴', 5, 4),
  ('00000000-0000-0000-0000-000000000001', 'accueil',  'Papier toilette',     '📄', 12, 8),
  ('00000000-0000-0000-0000-000000000001', 'accueil',  'Capsules café',       '☕', 20, 10);
