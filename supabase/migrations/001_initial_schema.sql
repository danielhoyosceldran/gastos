-- ============================================================
-- 001_initial_schema.sql
-- All tables with CHECK and UNIQUE constraints
-- ============================================================


-- profiles
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


-- tag_groups
CREATE TABLE tag_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) <= 100),
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);


-- tags
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


-- categories (self-referential, up to 3 levels enforced in app logic)
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
  -- NULLS NOT DISTINCT ensures root categories (parent_id IS NULL) are also unique per user
  UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name)
);


-- payment_methods
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


-- events
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


-- projects
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


-- expenses
CREATE TABLE expenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),  -- auto-set from profiles.currency at insert, immutable
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


-- expense_tags (join table — RLS enforced via parent expenses row)
CREATE TABLE expense_tags (
  expense_id  uuid NOT NULL REFERENCES expenses ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);


-- budgets
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
  currency        text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),  -- auto-set from profiles.currency at insert, immutable

  budget_type     text NOT NULL CHECK (budget_type IN ('months', 'range', 'total')),

  -- Type 'months': [{"year": 2025, "month": 6}, ...]
  months          jsonb,

  -- Type 'range': stored as 'YYYY-MM'
  starts_month    text CHECK (starts_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  ends_month      text CHECK (ends_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  CONSTRAINT range_end_after_start CHECK (
    ends_month IS NULL OR ends_month >= starts_month
  ),

  -- Enforce mutual exclusivity between budget types and their fields
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
