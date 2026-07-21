-- M6: Custom-Attribute – nur eigene Custom-Felder sichtbar/änderbar
-- Im Supabase SQL-Editor ausführen.

drop policy if exists "attribute_definitions_select_all_authenticated" on public.attribute_definitions;
drop policy if exists "attribute_definitions_insert_authenticated" on public.attribute_definitions;
drop policy if exists "attribute_definitions_select_own" on public.attribute_definitions;
drop policy if exists "attribute_definitions_insert_own" on public.attribute_definitions;
drop policy if exists "attribute_definitions_update_own" on public.attribute_definitions;
drop policy if exists "attribute_definitions_delete_own" on public.attribute_definitions;

create policy "attribute_definitions_select_own" on public.attribute_definitions
  for select to authenticated
  using (created_by = auth.uid());

create policy "attribute_definitions_insert_own" on public.attribute_definitions
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "attribute_definitions_update_own" on public.attribute_definitions
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "attribute_definitions_delete_own" on public.attribute_definitions
  for delete to authenticated
  using (created_by = auth.uid());
