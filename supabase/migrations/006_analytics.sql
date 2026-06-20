-- Analytics RPC functions

-- 1. Breakdown by dimension
CREATE OR REPLACE FUNCTION get_spending_by_dimension(
  p_dimension text,
  p_currency  text,
  p_from      date,
  p_to        date
)
RETURNS TABLE (dimension_id uuid, name text, total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE
  -- Resolve each category to its top-level ancestor by walking parent_id up
  cat_root AS (
    -- Base: top-level categories are their own root
    SELECT id, parent_id, name, id AS root_id, name AS root_name
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recurse: children inherit the root from their parent
    SELECT c.id, c.parent_id, c.name, cr.root_id, cr.root_name
    FROM categories c
    JOIN cat_root cr ON c.parent_id = cr.id
  )
  SELECT * FROM (
    -- category: rollup subcategories to top-level ancestor
    SELECT
      cr.root_id                                       AS dimension_id,
      cr.root_name                                     AS name,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount
               WHEN e.type = 'refund'  THEN -e.amount
               ELSE 0 END)                             AS total
    FROM expenses e
    JOIN cat_root cr ON cr.id = e.category_id
    WHERE p_dimension = 'category'
      AND e.user_id   = auth.uid()
      AND e.currency  = p_currency
      AND e.date     >= p_from
      AND e.date     <= p_to
      AND e.type     != 'income'
    GROUP BY cr.root_id, cr.root_name

    UNION ALL

    -- tag: join through expense_tags
    SELECT
      t.id    AS dimension_id,
      t.name  AS name,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount
               WHEN e.type = 'refund'  THEN -e.amount
               ELSE 0 END) AS total
    FROM expenses e
    JOIN expense_tags et ON et.expense_id = e.id
    JOIN tags t ON t.id = et.tag_id
    WHERE p_dimension = 'tag'
      AND e.user_id   = auth.uid()
      AND e.currency  = p_currency
      AND e.date     >= p_from
      AND e.date     <= p_to
      AND e.type     != 'income'
    GROUP BY t.id, t.name

    UNION ALL

    -- project
    SELECT
      p.id    AS dimension_id,
      p.name  AS name,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount
               WHEN e.type = 'refund'  THEN -e.amount
               ELSE 0 END) AS total
    FROM expenses e
    JOIN projects p ON p.id = e.project_id
    WHERE p_dimension = 'project'
      AND e.user_id   = auth.uid()
      AND e.currency  = p_currency
      AND e.date     >= p_from
      AND e.date     <= p_to
      AND e.type     != 'income'
    GROUP BY p.id, p.name

    UNION ALL

    -- event
    SELECT
      ev.id    AS dimension_id,
      ev.name  AS name,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount
               WHEN e.type = 'refund'  THEN -e.amount
               ELSE 0 END) AS total
    FROM expenses e
    JOIN events ev ON ev.id = e.event_id
    WHERE p_dimension = 'event'
      AND e.user_id   = auth.uid()
      AND e.currency  = p_currency
      AND e.date     >= p_from
      AND e.date     <= p_to
      AND e.type     != 'income'
    GROUP BY ev.id, ev.name
  ) q
  WHERE total != 0
  ORDER BY total DESC;
$$;

-- 2. Trend over time
CREATE OR REPLACE FUNCTION get_spending_over_time(
  p_currency text,
  p_from     date,
  p_to       date
)
RETURNS TABLE (year int, month int, spent numeric, income numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR  FROM e.date)::int AS year,
    EXTRACT(MONTH FROM e.date)::int AS month,
    SUM(CASE WHEN e.type = 'expense' THEN e.amount
             WHEN e.type = 'refund'  THEN -e.amount
             ELSE 0 END)            AS spent,
    SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END) AS income
  FROM expenses e
  WHERE e.user_id  = auth.uid()
    AND e.currency = p_currency
    AND e.date    >= p_from
    AND e.date    <= p_to
  GROUP BY year, month
  ORDER BY year, month;
$$;

GRANT EXECUTE ON FUNCTION get_spending_by_dimension(text, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_spending_over_time(text, date, date) TO authenticated;
