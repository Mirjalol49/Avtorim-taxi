insert into storage.buckets (id, name, public) values ('driver-documents', 'driver-documents', true) on conflict (id) do nothing;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'driver-documents' );
create policy "Anon Insert" on storage.objects for insert with check ( bucket_id = 'driver-documents' );
create policy "Anon Update" on storage.objects for update using ( bucket_id = 'driver-documents' );
create policy "Anon Delete" on storage.objects for delete using ( bucket_id = 'driver-documents' );
