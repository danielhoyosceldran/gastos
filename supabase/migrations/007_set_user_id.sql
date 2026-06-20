-- ============================================================
-- 007_set_user_id.sql
-- Auto-populate user_id from auth.uid() on INSERT for all
-- user-owned tables. This lets the frontend omit user_id in
-- insert payloads, and guarantees it always matches the
-- authenticated user (required by the RLS WITH CHECK clause).
-- ============================================================


CREATE OR REPLACE FUNCTION set_user_id_from_auth()
RETURNS trigger AS $$
BEGIN
  -- Only set on INSERT, and only when not already provided.
  -- auth.uid() is the authenticated user from the JWT.
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_id ON tag_groups;
CREATE TRIGGER set_user_id BEFORE INSERT ON tag_groups      FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON tags;
CREATE TRIGGER set_user_id BEFORE INSERT ON tags            FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON categories;
CREATE TRIGGER set_user_id BEFORE INSERT ON categories      FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON payment_methods;
CREATE TRIGGER set_user_id BEFORE INSERT ON payment_methods FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON events;
CREATE TRIGGER set_user_id BEFORE INSERT ON events          FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON projects;
CREATE TRIGGER set_user_id BEFORE INSERT ON projects        FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON expenses;
CREATE TRIGGER set_user_id BEFORE INSERT ON expenses        FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

DROP TRIGGER IF EXISTS set_user_id ON budgets;
CREATE TRIGGER set_user_id BEFORE INSERT ON budgets         FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();
