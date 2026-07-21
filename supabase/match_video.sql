-- M8: VEO / Video-Link + Zeitmarken am Match
-- Im Supabase SQL-Editor ausführen (einmalig auf bestehender DB).

alter table public.matches
  add column if not exists video_url text,
  add column if not exists video_ref text,
  add column if not exists video_markers jsonb not null default '[]'::jsonb;
