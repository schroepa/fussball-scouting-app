-- M7: Formationen & Phasen am Match
-- Im Supabase SQL-Editor ausführen (einmalig auf bestehender DB).

alter table public.matches
  add column if not exists formation_heim_off text,
  add column if not exists formation_heim_def text,
  add column if not exists formation_gast_off text,
  add column if not exists formation_gast_def text,
  add column if not exists phases jsonb not null default '[]'::jsonb;
