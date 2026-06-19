# Database Specs: Expense Tracking System

## Overview

- **Database:** PostgreSQL via Supabase
- **Data isolation:** Row Level Security (RLS) on all tables
- **User defaults:** Populated via trigger on user creation — stored as i18n keys, translated at render
- **Currency model:** `expenses.currency` and `budgets.currency` are set automatically from `profiles.currency` at insert time via DB trigger, and frozen on update. No currency conversion anywhere. Changing `profiles.currency` is allowed with a warning, but blocked if a live budget in the current currency already has transactions.
- **Registration:** disabled in UI — users are created directly via Supabase SQL/dashboard by the admin
- **Migrations:** versioned SQL files under `supabase/migrations/`

---

## Schema

### `profiles`

```sql
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email         text NOT NULL,
  language      text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es', 'ca', 'fr', 'it')),
  currency      text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  primary_color text NOT NULL DEFAULT 'blue' CHECK (primary_color IN ('blue', 'green', 'red')),
  theme         text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  is_admin      boolean NOT NULL DEFAULT false,
  approved      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

> `is_admin` and `approved` are protected from self-modification via a BEFORE UPDATE trigger.  
> `theme` is also stored in `localStorage` on the client to avoid flash-of-wrong-theme on load.  
> Changing `currency` is allowed with a warning, but blocked in application logic if a live budget in the current currency already has transactions.

---

### `tag_groups`

```sql
CREATE TABLE tag_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 100),
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

> `tag_group.ungrouped` is the system bucket for tags without a group.  
> Before deleting any tag group, the application reassigns all its tags to the `ungrouped` group.  
> The FK on `tags.tag_group_id` is `ON DELETE RESTRICT` — deletion is blocked while the group still has tags. `tag_group_id` is `NOT NULL`, so every tag always belongs to a group.

---

### `tags`

```sql
CREATE TABLE tags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  tag_group_id  uuid NOT NULL REFERENCES tag_groups ON DELETE RESTRICT,
  name          text NOT NULL CHECK (char_length(name) <= 100),
  color         text CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon          text CHECK (char_length(icon) <= 50),
  is_default    boolean NOT NULL DEFAULT false,
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

> `tag_group_id` is `NOT NULL` — every tag belongs to a group. Orphaned tags are reassigned to `tag_group.ungrouped` in application logic before their group is deleted (`ON DELETE RESTRICT` prevents accidental cascade).  
> When `is_default` is edited by the user, it is set to `false` — the value is no longer an i18n key.

---

### `categories`
Self-referential table supporting up to 3 optional levels.

```sql
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  parent_id   uuid REFERENCES categories ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 100),
  color       text CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon        text CHECK (char_length(icon) <= 50),
  is_default  boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name)
);
```

> Max 3 levels enforced in application logic.  
> `UNIQUE NULLS NOT DISTINCT` handles root categories (where `parent_id` is NULL) correctly.  
> Deleting a category cascades to subcategories and budgets. Expenses get `category_id = NULL`. UI must warn.  
> Editing a default category sets `is_default = false`.

---

### `payment_methods`

```sql
CREATE TABLE payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 100),
  icon        text CHECK (char_length(icon) <= 50),
  is_default  boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

---

### `events`

```sql
CREATE TABLE events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 150),
  description text CHECK (char_length(description) <= 500),
  starts_at   date,
  ends_at     date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

> Deleting an event cascades to budgets. Expenses get `event_id = NULL`. UI must warn.

---

### `projects`

```sql
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 150),
  description text CHECK (char_length(description) <= 500),
  starts_at   date,
  ends_at     date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

> No `budget` column — project budgets are managed via the `budgets` table.  
> Deleting a project cascades to budgets. Expenses get `project_id = NULL`. UI must warn.

---

### `expenses`

```sql
CREATE TABLE expenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  type              text NOT NULL CHECK (type IN ('expense', 'income', 'refund')),
  date              date NOT NULL,
  description       text CHECK (char_length(description) <= 300),
  notes             text CHECK (char_length(notes) <= 1000),
  category_id       uuid REFERENCES categories ON DELETE SET NULL,
  payment_method_id uuid REFERENCES payment_methods ON DELETE SET NULL,
  event_id          uuid REFERENCES events ON DELETE SET NULL,
  project_id        uuid REFERENCES projects ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

> `currency` is set automatically from `profiles.currency` at insert time via the `enforce_currency_from_profile` trigger, and frozen on update — never editable by the user.  
> Historical expenses always display with their original currency.  
> All display and budget calculations are done per-currency grouping — no conversion needed.

---

### `expense_tags`

```sql
CREATE TABLE expense_tags (
  expense_id  uuid NOT NULL REFERENCES expenses ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);
```

> No `user_id` — RLS enforced via `EXISTS` on the parent `expenses` row.

---

### `budgets`
Three mutually exclusive types:

- **`months`:** explicit list of calendar months
- **`range`:** from a starting month, with optional end (null = indefinite)
- **`total`:** lifetime accumulated — no time window, for projects and events

```sql
CREATE TABLE budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(name) <= 150),

  -- Exactly one dimension must be set
  category_id     uuid REFERENCES categories ON DELETE CASCADE,
  tag_id          uuid REFERENCES tags ON DELETE CASCADE,
  project_id      uuid REFERENCES projects ON DELETE CASCADE,
  event_id        uuid REFERENCES events ON DELETE CASCADE,

  CONSTRAINT one_dimension CHECK (
    num_nonnulls(category_id, tag_id, project_id, event_id) = 1
  ),

  amount          numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),  -- set from profiles.currency at insert, immutable

  budget_type     text NOT NULL CHECK (budget_type IN ('months', 'range', 'total')),

  -- Type 'months': [{"year": 2025, "month": 6}, {"year": 2025, "month": 7}]
  months          jsonb,

  -- Type 'range': stored as 'YYYY-MM', validated by CHECK
  starts_month    text CHECK (starts_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  ends_month      text CHECK (ends_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  CONSTRAINT range_end_after_start CHECK (
    ends_month IS NULL OR ends_month >= starts_month
  ),

  CONSTRAINT budget_type_check CHECK (
    (budget_type = 'months'
      AND months IS NOT NULL
      AND starts_month IS NULL AND ends_month IS NULL)
    OR
    (budget_type = 'range'
      AND starts_month IS NOT NULL
      AND months IS NULL)
    OR
    (budget_type = 'total'
      AND months IS NULL
      AND starts_month IS NULL AND ends_month IS NULL)
  ),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

> JSONB structure for `months` (`[{year, month}]`) is validated in application logic, not at DB level.  
> `total` type budgets appear only on the Budgets page — not on the Dashboard.

---

## Budget Calculation Rules

Calculations are executed server-side as **Supabase RPC functions**.  
The RPC signature for month-based budgets is: `get_budget_progress(budget_id, year, month)`.  
The progress follows the month currently navigated in the Dashboard.

- **`months` type:** active if `{year, month}` appears in the `months` array.
- **`range` type:** active if `YYYY-MM` >= `starts_month` and <= `ends_month` (or null).
- **`total` type:** no time window — accumulates all expenses ever. No month parameter needed.
- **Category budgets:** recursive — includes the category and all its subcategories.
- **Tag budgets:** all expenses with the given tag via `expense_tags`.
- **Project / Event budgets:** all expenses linked to that project or event.
- **`expense`:** counts positively. **`refund`:** discounts. **`income`:** ignored.
- **Currency:** the RPC filters by `budgets.currency` (not `profiles.currency`) — a budget always tracks expenses in its own frozen currency.

---

## Income & Refund Behavior

| Type | Budget impact | Dashboard "Total spent" | Balance |
|---|---|---|---|
| `expense` | ➕ Counts against budget | ➕ Adds to total | ➖ |
| `refund` | ➖ Discounts from budget | ➖ Reduces total | ➕ |
| `income` | — No impact | — Not included | ➕ |

**Dashboard shows (filtered to expenses matching `profiles.currency` at time of viewing):**
- Total spent (expenses − refunds)
- Total income
- Net balance

---

## Currency Model

- `expenses.currency` and `budgets.currency` are set automatically from `profiles.currency` **at insert time** via the `enforce_currency_from_profile` trigger
- Both fields are **frozen on update** — never editable by the user in any form
- Changing `profiles.currency` is **allowed**, with a warning that existing records keep their original currency
- The change is **blocked** in application logic if there is a live budget in the current currency that already has transactions. A budget is live when:
  - `total` type → always live
  - `range` type → `ends_month IS NULL` or `ends_month >= current month`
  - `months` type → highest month in the array `>= current month`
- No currency conversion anywhere — totals and budget progress are calculated within each record's own currency

---

## Row Level Security (RLS)

### Helper function

```sql
CREATE OR REPLACE FUNCTION is_approved()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND approved = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Standard tables

```sql
-- Pattern applied to all tables except profiles and expense_tags
CREATE POLICY "approved users manage own data" ON expenses
  FOR ALL USING (user_id = auth.uid() AND is_approved());
```

### `profiles` — split policies

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "approved users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid() AND is_approved())
  WITH CHECK (id = auth.uid() AND is_approved());
```

### `expense_tags` — RLS via parent

```sql
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own expense tags" ON expense_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_tags.expense_id
        AND expenses.user_id = auth.uid()
    )
    AND is_approved()
  );
```

---

## Indexes

```sql
CREATE INDEX idx_expenses_user_date        ON expenses (user_id, date);
CREATE INDEX idx_expenses_category         ON expenses (category_id);
CREATE INDEX idx_expenses_event            ON expenses (event_id);
CREATE INDEX idx_expenses_project          ON expenses (project_id);
CREATE INDEX idx_expenses_payment_method   ON expenses (payment_method_id);
CREATE INDEX idx_expenses_type             ON expenses (type);
CREATE INDEX idx_expenses_currency         ON expenses (currency);
CREATE INDEX idx_expense_tags_tag          ON expense_tags (tag_id);
CREATE INDEX idx_categories_parent         ON categories (parent_id);
CREATE INDEX idx_categories_position       ON categories (user_id, position);
CREATE INDEX idx_tags_position             ON tags (user_id, position);
CREATE INDEX idx_payment_methods_position  ON payment_methods (user_id, position);
CREATE INDEX idx_tag_groups_position       ON tag_groups (user_id, position);
CREATE INDEX idx_budgets_user_type         ON budgets (user_id, budget_type);
CREATE INDEX idx_budgets_range             ON budgets (starts_month, ends_month) WHERE budget_type = 'range';
```

---

## Triggers

### `updated_at` on all tables

```sql
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
```

### Enforce and freeze `currency` on `expenses` and `budgets`

```sql
CREATE OR REPLACE FUNCTION enforce_currency_from_profile()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Set currency from the user's profile at time of creation
    SELECT currency INTO NEW.currency
    FROM profiles
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Freeze currency — prevent any modification
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
```

---

### Protect `is_admin` and `approved` in `profiles`

```sql
CREATE OR REPLACE FUNCTION protect_profile_admin_fields()
RETURNS trigger AS $$
BEGIN
  -- Only restrict API-authenticated updates.
  -- Direct SQL in Supabase dashboard has no auth.uid() context — let it through.
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
```

---

## User Defaults Trigger

Default names stored as i18n keys. Translated at render time. Editing a default sets `is_default = false` — the value becomes free text permanently.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_ungrouped_id  uuid := gen_random_uuid();
  v_social_id     uuid := gen_random_uuid();
  v_motivation_id uuid := gen_random_uuid();
  v_moment_id     uuid := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO tag_groups (id, user_id, name, position)
  VALUES
    (v_ungrouped_id,  NEW.id, 'tag_group.ungrouped',     0),
    (v_social_id,     NEW.id, 'tag_group.social_context', 1),
    (v_motivation_id, NEW.id, 'tag_group.motivation',     2),
    (v_moment_id,     NEW.id, 'tag_group.life_moment',    3);

  INSERT INTO tags (user_id, tag_group_id, name, is_default, position)
  VALUES
    (NEW.id, v_social_id,     'tag.alone',      true, 0),
    (NEW.id, v_social_id,     'tag.partner',    true, 1),
    (NEW.id, v_social_id,     'tag.family',     true, 2),
    (NEW.id, v_social_id,     'tag.friends',    true, 3),
    (NEW.id, v_social_id,     'tag.work',       true, 4),
    (NEW.id, v_motivation_id, 'tag.leisure',    true, 0),
    (NEW.id, v_motivation_id, 'tag.necessity',  true, 1),
    (NEW.id, v_motivation_id, 'tag.whim',       true, 2),
    (NEW.id, v_motivation_id, 'tag.gift',       true, 3),
    (NEW.id, v_motivation_id, 'tag.investment', true, 4),
    (NEW.id, v_moment_id,     'tag.vacation',   true, 0),
    (NEW.id, v_moment_id,     'tag.weekend',    true, 1),
    (NEW.id, v_moment_id,     'tag.routine',    true, 2),
    (NEW.id, v_moment_id,     'tag.unexpected', true, 3);

  INSERT INTO categories (user_id, name, is_default, position)
  VALUES
    (NEW.id, 'category.food',       true, 0),
    (NEW.id, 'category.transport',  true, 1),
    (NEW.id, 'category.housing',    true, 2),
    (NEW.id, 'category.leisure',    true, 3),
    (NEW.id, 'category.health',     true, 4),
    (NEW.id, 'category.clothing',   true, 5),
    (NEW.id, 'category.education',  true, 6);

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
```

---

## Admin Setup (Manual SQL)

```sql
-- Approve a regular user
UPDATE profiles SET approved = true WHERE email = 'user@example.com';

-- Owner bootstrap: must be BOTH approved and admin, or RLS blocks all data access
UPDATE profiles
SET approved = true,
    is_admin = true
WHERE email = 'owner@example.com';
```

> `protect_profile_admin_fields` only fires when `auth.uid() IS NOT NULL` (API sessions).  
> Direct SQL in the Supabase dashboard bypasses it correctly.

---

## Migration Files Structure

```
supabase/
  migrations/
    001_initial_schema.sql   -- CREATE TABLE + CHECK + UNIQUE constraints
    002_indexes.sql          -- All indexes
    003_rls.sql              -- is_approved() helper + all RLS policies
    004_triggers.sql         -- set_updated_at, protect_profile_admin_fields, enforce_currency_from_profile, handle_new_user
    005_rpc.sql              -- Budget calculation RPC functions
```

---

## Deletion Behavior Summary

| Deleted | Effect on expenses | Effect on budgets |
|---|---|---|
| `categories` | `category_id` → NULL | CASCADE deleted |
| `tags` | `expense_tags` row CASCADE deleted | CASCADE deleted |
| `events` | `event_id` → NULL | CASCADE deleted |
| `projects` | `project_id` → NULL | CASCADE deleted |
| `payment_methods` | `payment_method_id` → NULL | — |
| `tag_groups` | Tags reassigned to `ungrouped` in app logic (RESTRICT prevents direct cascade) | — |

> UI must warn before deleting anything that cascades to budgets.

---

## Entity Relationship Summary

```
profiles
  ├── categories (hierarchical via parent_id, UNIQUE NULLS NOT DISTINCT, position)
  ├── tag_groups (position)
  │     └── tags (NOT NULL group, position, is_default → false on edit)
  ├── payment_methods (position)
  ├── events
  ├── projects
  ├── budgets (currency auto-set from profiles.currency at insert, immutable; months | range | total; one dimension; RPC for progress)
  └── expenses (currency auto-set from profiles.currency at insert, immutable)
        ├── category_id
        ├── payment_method_id
        ├── event_id
        ├── project_id
        └── expense_tags → tags
```
