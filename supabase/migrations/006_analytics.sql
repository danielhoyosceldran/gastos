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
  SELECT * FROM (
    -- category: rollup subcategories to top-level ancestor
    SELECT
      COALESCE(root.id, c.id)                          AS dimension_id,
      COALESCE(root.name, c.name)                      AS name,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount
               WHEN e.type = 'refund'  THEN -e.amount
               ELSE 0 END)                             AS total
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    LEFT JOIN categories root ON root.id = c.root_id
    WHERE p_dimension = 'category'
      AND e.user_id   = auth.uid()
      AND e.currency  = p_currency
      AND e.date     >= p_from
      AND e.date     <= p_to
      AND e.type     != 'income'
    GROUP BY COALESCE(root.id, c.id), COALESCE(root.name, c.name)

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
