-- Endurece o bucket de imagens de produto com privilegio minimo:
-- leitura publica apenas do bucket necessario e upload somente por usuarios autenticados.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "produtos_public_read" on storage.objects;
drop policy if exists "produtos_authenticated_insert" on storage.objects;
drop policy if exists "produtos_authenticated_update" on storage.objects;
drop policy if exists "produtos_authenticated_delete" on storage.objects;

create policy "produtos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'produtos');

create policy "produtos_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'produtos');
