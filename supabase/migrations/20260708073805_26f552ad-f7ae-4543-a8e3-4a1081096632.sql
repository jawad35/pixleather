-- Keep products.reviews_count and rating in sync with approved reviews
CREATE OR REPLACE FUNCTION public.sync_product_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products p
  SET reviews_count = sub.cnt,
      rating = sub.avg_rating
  FROM (
    SELECT
      COUNT(*)::int AS cnt,
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating
    FROM public.reviews
    WHERE product_id = pid AND approved = true
  ) sub
  WHERE p.id = pid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_review_stats_ins ON public.reviews;
DROP TRIGGER IF EXISTS trg_sync_review_stats_upd ON public.reviews;
DROP TRIGGER IF EXISTS trg_sync_review_stats_del ON public.reviews;

CREATE TRIGGER trg_sync_review_stats_ins
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_product_review_stats();

CREATE TRIGGER trg_sync_review_stats_upd
AFTER UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_product_review_stats();

CREATE TRIGGER trg_sync_review_stats_del
AFTER DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_product_review_stats();

-- Backfill current counts
UPDATE public.products p
SET reviews_count = sub.cnt, rating = sub.avg_rating
FROM (
  SELECT product_id, COUNT(*)::int AS cnt,
         COALESCE(ROUND(AVG(rating)::numeric,1),0) AS avg_rating
  FROM public.reviews WHERE approved = true GROUP BY product_id
) sub
WHERE p.id = sub.product_id;

-- Users can edit their own reviews
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can manage roles (assign/revoke admin)
CREATE POLICY "Admins insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));