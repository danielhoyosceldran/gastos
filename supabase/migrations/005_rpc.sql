-- ============================================================
-- 005_rpc.sql
-- Budget progress RPC functions
-- Called from the frontend as: supabase.rpc('get_budget_progress', { budget_id, year, month })
-- ============================================================


CREATE OR REPLACE FUNCTION get_budget_progress(
  p_budget_id uuid,
  p_year      integer,
  p_month     integer
)
RETURNS TABLE (
  budget_id   uuid,
  spent       numeric,
  limit_amount numeric,
  currency    text,
  is_active   boolean
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_budget        budgets%ROWTYPE;
  v_current_month text;
  v_active        boolean;
  v_spent         numeric;
BEGIN
  -- Load the budget row
  SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;

  -- Build 'YYYY-MM' string for range comparisons
  v_current_month := to_char(
    make_date(p_year, p_month, 1),
    'YYYY-MM'
  );

  -- Determine whether this budget is active for the requested month
  CASE v_budget.budget_type
    WHEN 'months' THEN
      -- Active if the {year, month} pair exists in the jsonb array
      v_active := EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_budget.months) AS m
        WHERE (m->>'year')::integer = p_year
          AND (m->>'month')::integer = p_month
      );

    WHEN 'range' THEN
      -- Active if current month falls within [starts_month, ends_month]
      -- ends_month IS NULL means open-ended (no expiry)
      v_active := v_current_month >= v_budget.starts_month
        AND (v_budget.ends_month IS NULL OR v_current_month <= v_budget.ends_month);

    WHEN 'total' THEN
      -- Always active — accumulates all expenses with no time window
      v_active := true;
  END CASE;

  -- Calculate spent amount based on dimension and budget type
  -- expense counts positively, refund discounts, income is ignored
  IF v_budget.budget_type = 'total' THEN

    -- Total type: aggregate across all time, no date filter
    CASE
      WHEN v_budget.category_id IS NOT NULL THEN
        -- Category budget: recursive — includes subcategories at all depths
        WITH RECURSIVE subcats AS (
          SELECT id FROM categories WHERE id = v_budget.category_id
          UNION ALL
          SELECT c.id FROM categories c
          INNER JOIN subcats s ON c.parent_id = s.id
        )
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.category_id IN (SELECT id FROM subcats)
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id;

      WHEN v_budget.tag_id IS NOT NULL THEN
        -- Tag budget: join through expense_tags
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        INNER JOIN expense_tags et ON et.expense_id = e.id
        WHERE et.tag_id = v_budget.tag_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id;

      WHEN v_budget.project_id IS NOT NULL THEN
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.project_id = v_budget.project_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id;

      WHEN v_budget.event_id IS NOT NULL THEN
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.event_id = v_budget.event_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id;
    END CASE;

  ELSE

    -- months / range types: filter to the requested calendar month
    CASE
      WHEN v_budget.category_id IS NOT NULL THEN
        WITH RECURSIVE subcats AS (
          SELECT id FROM categories WHERE id = v_budget.category_id
          UNION ALL
          SELECT c.id FROM categories c
          INNER JOIN subcats s ON c.parent_id = s.id
        )
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.category_id IN (SELECT id FROM subcats)
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id
          AND EXTRACT(YEAR  FROM e.date) = p_year
          AND EXTRACT(MONTH FROM e.date) = p_month;

      WHEN v_budget.tag_id IS NOT NULL THEN
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        INNER JOIN expense_tags et ON et.expense_id = e.id
        WHERE et.tag_id = v_budget.tag_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id
          AND EXTRACT(YEAR  FROM e.date) = p_year
          AND EXTRACT(MONTH FROM e.date) = p_month;

      WHEN v_budget.project_id IS NOT NULL THEN
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.project_id = v_budget.project_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id
          AND EXTRACT(YEAR  FROM e.date) = p_year
          AND EXTRACT(MONTH FROM e.date) = p_month;

      WHEN v_budget.event_id IS NOT NULL THEN
        SELECT COALESCE(SUM(
          CASE e.type
            WHEN 'expense' THEN e.amount
            WHEN 'refund'  THEN -e.amount
            ELSE 0
          END
        ), 0)
        INTO v_spent
        FROM expenses e
        WHERE e.event_id = v_budget.event_id
          AND e.currency = v_budget.currency
          AND e.user_id = v_budget.user_id
          AND EXTRACT(YEAR  FROM e.date) = p_year
          AND EXTRACT(MONTH FROM e.date) = p_month;
    END CASE;

  END IF;

  -- Return a single row with the computed values
  RETURN QUERY SELECT
    v_budget.id,
    v_spent,
    v_budget.amount,
    v_budget.currency,
    v_active;
END;
$$;
