-- ============================================================
-- 003_rls.sql
-- is_approved() helper + all Row Level Security policies
-- ============================================================


-- Helper: checks that the calling user is approved
CREATE OR REPLACE FUNCTION is_approved()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND approved = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── profiles ────────────────────────────────────────────────
-- Any authenticated user can read their own profile (needed before approval)
-- Only approved users can update their profile

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own profile" ON profiles;
CREATE POLICY "users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "approved users update own profile" ON profiles;
CREATE POLICY "approved users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid() AND is_approved())
  WITH CHECK (id = auth.uid() AND is_approved());


-- ── expense_tags ─────────────────────────────────────────────
-- No user_id column — ownership inferred via parent expenses row
-- WITH CHECK validates the row being inserted/updated belongs to the user

ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own expense tags" ON expense_tags;
CREATE POLICY "users manage own expense tags" ON expense_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_tags.expense_id
        AND expenses.user_id = auth.uid()
    )
    AND is_approved()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_tags.expense_id
        AND expenses.user_id = auth.uid()
    )
    AND is_approved()
  );


-- ── Standard tables ──────────────────────────────────────────
-- Approved users can only access their own rows (full CRUD)
-- USING covers SELECT/UPDATE/DELETE; WITH CHECK covers INSERT/UPDATE
-- Without WITH CHECK, all INSERTs are rejected with error 42501

ALTER TABLE tag_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved users manage own data" ON tag_groups;
CREATE POLICY "approved users manage own data" ON tag_groups
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON tags;
CREATE POLICY "approved users manage own data" ON tags
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON categories;
CREATE POLICY "approved users manage own data" ON categories
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON payment_methods;
CREATE POLICY "approved users manage own data" ON payment_methods
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON events;
CREATE POLICY "approved users manage own data" ON events
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON projects;
CREATE POLICY "approved users manage own data" ON projects
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON expenses;
CREATE POLICY "approved users manage own data" ON expenses
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS "approved users manage own data" ON budgets;
CREATE POLICY "approved users manage own data" ON budgets
  FOR ALL
  USING (user_id = auth.uid() AND is_approved())
  WITH CHECK (user_id = auth.uid() AND is_approved());
