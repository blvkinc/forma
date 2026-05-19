drop policy if exists "Artwork images are publicly readable" on storage.objects;

drop policy if exists "Artists can upload artwork images" on storage.objects;
create policy "Artists can upload artwork images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
  );

drop policy if exists "Artists can update own artwork images" on storage.objects;
create policy "Artists can update own artwork images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
  );

drop policy if exists "Artists can delete own artwork images" on storage.objects;
create policy "Artists can delete own artwork images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
  );
