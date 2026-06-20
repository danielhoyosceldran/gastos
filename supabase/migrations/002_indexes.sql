-- ============================================================
-- 002_indexes.sql
-- All indexes for query performance
-- ============================================================


-- expenses: most common filter patterns
CREATE INDEX idx_expenses_user_date        ON expenses (user_id, date);
CREATE INDEX idx_expenses_category         ON expenses (category_id);
CREATE INDEX idx_expenses_event            ON expenses (event_id);
CREATE INDEX idx_expenses_project          ON expenses (project_id);
CREATE INDEX idx_expenses_payment_method   ON expenses (payment_method_id);
CREATE INDEX idx_expenses_type             ON expenses (type);
CREATE INDEX idx_expenses_currency         ON expenses (currency);

-- expense_tags: tag-based lookups
CREATE INDEX idx_expense_tags_tag          ON expense_tags (tag_id);

-- categories: tree traversal and ordered lists
CREATE INDEX idx_categories_parent         ON categories (parent_id);
CREATE INDEX idx_categories_position       ON categories (user_id, position);

-- tags and tag_groups: ordered lists
CREATE INDEX idx_tags_position             ON tags (user_id, position);
CREATE INDEX idx_payment_methods_position  ON payment_methods (user_id, position);
CREATE INDEX idx_tag_groups_position       ON tag_groups (user_id, position);

-- budgets: type filtering and range queries
CREATE INDEX idx_budgets_user_type         ON budgets (user_id, budget_type);
CREATE INDEX idx_budgets_range             ON budgets (starts_month, ends_month) WHERE budget_type = 'range';
