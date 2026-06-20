-- 009: Batch reorder RPC.
--
-- The client previously issued one UPDATE per item when reordering a list
-- (drag and drop), i.e. N round-trips per drag. This RPC applies the new
-- order in a single statement. The table name is whitelisted to avoid SQL
-- injection via the dynamic identifier, and rows are scoped to auth.uid() so
-- a caller can only reorder their own data (RLS also applies).

CREATE OR REPLACE FUNCTION reorder_items(p_table text, p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table NOT IN ('categories', 'tags', 'tag_groups', 'payment_methods') THEN
    RAISE EXCEPTION 'invalid table %', p_table;
  END IF;

  EXECUTE format(
    'UPDATE %I t
        SET position = x.ord - 1
       FROM unnest($1) WITH ORDINALITY AS x(id, ord)
      WHERE t.id = x.id
        AND t.user_id = auth.uid()', p_table)
  USING p_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_items(text, uuid[]) TO authenticated;
