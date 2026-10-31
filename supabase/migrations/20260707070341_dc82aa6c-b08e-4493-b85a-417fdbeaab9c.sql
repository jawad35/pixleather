
CREATE POLICY "Public read shop images" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('product-images','category-images','story-images'));

CREATE POLICY "Admins upload shop images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('product-images','category-images','story-images') AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update shop images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('product-images','category-images','story-images') AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete shop images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('product-images','category-images','story-images') AND public.has_role(auth.uid(), 'admin'));
