revoke insert, update, delete on table public.listing_images
  from public, anon, authenticated;
grant select on table public.listing_images to anon, authenticated;
grant all privileges on table public.listing_images to service_role;

drop policy if exists "Clients cannot insert listing image objects" on storage.objects;
create policy "Clients cannot insert listing image objects"
  on storage.objects as restrictive
  for insert to anon, authenticated
  with check (bucket_id <> 'listing-images');

drop policy if exists "Clients cannot update listing image objects" on storage.objects;
create policy "Clients cannot update listing image objects"
  on storage.objects as restrictive
  for update to anon, authenticated
  using (bucket_id <> 'listing-images')
  with check (bucket_id <> 'listing-images');

drop policy if exists "Clients cannot delete listing image objects" on storage.objects;
create policy "Clients cannot delete listing image objects"
  on storage.objects as restrictive
  for delete to anon, authenticated
  using (bucket_id <> 'listing-images');