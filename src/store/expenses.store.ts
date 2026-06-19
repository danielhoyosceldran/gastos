import { create } from 'zustand';

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
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  category_id?: string;
  tag_id?: string;
  event_id?: string;
  project_id?: string;
  payment_method_id?: string;
  type?: ExpenseType;
  date_from?: string;
  date_to?: string;
}

interface ExpensesState {
  expenses: Expense[];
  activeFilters: ExpenseFilters;
  setExpenses: (expenses: Expense[]) => void;
  setFilters: (filters: ExpenseFilters) => void;
  clearFilters: () => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],
  activeFilters: {},
  setExpenses: (expenses) => set({ expenses }),
  setFilters: (filters) => set({ activeFilters: filters }),
  clearFilters: () => set({ activeFilters: {} }),
}));
