create policy "media authenticated read" on storage.objects for select to authenticated
  using (bucket_id = 'media');
create policy "media authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');
create policy "media owner update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
create policy "media owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());