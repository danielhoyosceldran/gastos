export type ExpenseType = 'expense' | 'income' | 'refund';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: ExpenseType;
  date: string;
  description: string | null;
  notes: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  event_id: string | null;
  project_id: string | null;
  tag_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseDTO {
  amount: number;
  type: ExpenseType;
  date: string;
  description?: string | null;
  notes?: string | null;
  category_id?: string | null;
  payment_method_id?: string | null;
  event_id?: string | null;
  project_id?: string | null;
  tag_ids?: string[];
}

export interface UpdateExpenseDTO {
  amount?: number;
  type?: ExpenseType;
  date?: string;
  description?: string | null;
  notes?: string | null;
  category_id?: string | null;
  payment_method_id?: string | null;
  event_id?: string | null;
  project_id?: string | null;
  tag_ids?: string[];
}
