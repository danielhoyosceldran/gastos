-- ============================================================
-- 004_triggers.sql
-- set_updated_at, protect_profile_admin_fields,
-- enforce_currency_from_profile, handle_new_user
-- ============================================================


-- ── set_updated_at ───────────────────────────────────────────
-- Automatically updates updated_at on every row update

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tag_groups      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tags            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON categories      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON events          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON expenses        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON budgets         FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── protect_profile_admin_fields ─────────────────────────────
-- Prevents API-authenticated users from modifying is_admin and approved.
-- Direct SQL in Supabase dashboard (auth.uid() IS NULL) bypasses this correctly.

CREATE OR REPLACE FUNCTION protect_profile_admin_fields()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.is_admin = OLD.is_admin;
    NEW.approved = OLD.approved;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_protect_admin_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_fields();


-- ── enforce_currency_from_profile ────────────────────────────
-- On INSERT: copies currency from profiles.currency at creation time.
-- On UPDATE: freezes currency — any attempt to change it is silently reverted.

CREATE OR REPLACE FUNCTION enforce_currency_from_profile()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Fall back to auth.uid() in case user_id has not been populated yet
    -- by another BEFORE trigger (trigger execution order is alphabetical).
    SELECT currency INTO NEW.currency
    FROM profiles
    WHERE id = COALESCE(NEW.user_id, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Currency is immutable after creation
    NEW.currency = OLD.currency;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_enforce_currency
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION enforce_currency_from_profile();

CREATE TRIGGER budgets_enforce_currency
  BEFORE INSERT OR UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION enforce_currency_from_profile();


-- ── handle_new_user ──────────────────────────────────────────
-- Fires after a new auth.users row is inserted.
-- Creates the profile and seeds default data using i18n keys.
-- Default names are translated at render time in the frontend.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_ungrouped_id  uuid := gen_random_uuid();
  v_social_id     uuid := gen_random_uuid();
  v_motivation_id uuid := gen_random_uuid();
  v_moment_id     uuid := gen_random_uuid();
BEGIN
  -- Create the user profile
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);

  -- Seed default tag groups (ungrouped is the system fallback bucket)
  INSERT INTO tag_groups (id, user_id, name, position)
  VALUES
    (v_ungrouped_id,  NEW.id, 'tag_group.ungrouped',      0),
    (v_social_id,     NEW.id, 'tag_group.social_context',  1),
    (v_motivation_id, NEW.id, 'tag_group.motivation',      2),
    (v_moment_id,     NEW.id, 'tag_group.life_moment',     3);

  -- Seed default tags per group
  INSERT INTO tags (user_id, tag_group_id, name, is_default, position)
  VALUES
    -- Social context
    (NEW.id, v_social_id,     'tag.alone',      true, 0),
    (NEW.id, v_social_id,     'tag.partner',    true, 1),
    (NEW.id, v_social_id,     'tag.family',     true, 2),
    (NEW.id, v_social_id,     'tag.friends',    true, 3),
    (NEW.id, v_social_id,     'tag.work',       true, 4),
    -- Motivation
    (NEW.id, v_motivation_id, 'tag.leisure',    true, 0),
    (NEW.id, v_motivation_id, 'tag.necessity',  true, 1),
    (NEW.id, v_motivation_id, 'tag.whim',       true, 2),
    (NEW.id, v_motivation_id, 'tag.gift',       true, 3),
    (NEW.id, v_motivation_id, 'tag.investment', true, 4),
    -- Life moment
    (NEW.id, v_moment_id,     'tag.vacation',   true, 0),
    (NEW.id, v_moment_id,     'tag.weekend',    true, 1),
    (NEW.id, v_moment_id,     'tag.routine',    true, 2),
    (NEW.id, v_moment_id,     'tag.unexpected', true, 3);

  -- Seed default top-level categories
  INSERT INTO categories (user_id, name, is_default, position)
  VALUES
    (NEW.id, 'category.food',       true, 0),
    (NEW.id, 'category.transport',  true, 1),
    (NEW.id, 'category.housing',    true, 2),
    (NEW.id, 'category.leisure',    true, 3),
    (NEW.id, 'category.health',     true, 4),
    (NEW.id, 'category.clothing',   true, 5),
    (NEW.id, 'category.education',  true, 6);

  -- Seed default payment methods
  INSERT INTO payment_methods (user_id, name, is_default, position)
  VALUES
    (NEW.id, 'payment.cash',        true, 0),
    (NEW.id, 'payment.credit_card', true, 1),
    (NEW.id, 'payment.debit_card',  true, 2),
    (NEW.id, 'payment.transfer',    true, 3);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
