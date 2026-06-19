export type BudgetType = 'months' | 'range' | 'total';
export type BudgetDimension = 'category' | 'tag' | 'project' | 'event';

export interface BudgetMonth { year: number; month: number }

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  tag_id: string | null;
  project_id: string | null;
  event_id: string | null;
  amount: number;
  currency: string;
  budget_type: BudgetType;
  months: BudgetMonth[] | null;
  starts_month: string | null;
  ends_month: string | null;
  created_at: string;
  updated_at: string;
  // derived
  spent?: number;
}

export interface CreateBudgetDTO {
  name: string;
  category_id?: string | null;
  tag_id?: string | null;
  project_id?: string | null;
  event_id?: string | null;
  amount: number;
  budget_type: BudgetType;
  months?: BudgetMonth[] | null;
  starts_month?: string | null;
  ends_month?: string | null;
}

export interface UpdateBudgetDTO {
  name?: string;
  amount?: number;
  budget_type?: BudgetType;
  months?: BudgetMonth[] | null;
  starts_month?: string | null;
  ends_month?: string | null;
}
