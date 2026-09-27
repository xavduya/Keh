-- ============================================================
-- Migration 008 — Product image storage
--
-- Public bucket for product photos. Files live under
-- "<business_id>/<random>.<ext>", and owners can only write
-- inside their own business's folder. Reads go through the
-- public URL, so no select policy is needed for viewers.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB, matches MAX_UPLOAD_BYTES
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "product-images: owner can select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select b::text from public.get_user_business_ids() as b
    )
  );

create policy "product-images: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select b::text from public.get_user_business_ids() as b
    )
  );

create policy "product-images: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select b::text from public.get_user_business_ids() as b
    )
  );

create policy "product-images: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select b::text from public.get_user_business_ids() as b
    )
  );
