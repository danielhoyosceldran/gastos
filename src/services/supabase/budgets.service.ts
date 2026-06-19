import { supabase } from '../../lib/supabase';
import type { Budget, CreateBudgetDTO, UpdateBudgetDTO } from '../../types/budget.types';

const COLS = 'id,user_id,name,category_id,tag_id,project_id,event_id,amount,currency,budget_type,months,starts_month,ends_month,created_at,updated_at';

export const budgetsService = {
  async getAll(): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select(COLS)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Budget[];
  },

  async create(dto: CreateBudgetDTO): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .insert(dto)
      .select(COLS)
      .single();
    if (error) throw error;
    return data as Budget;
  },

  async update(id: string, dto: UpdateBudgetDTO): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update(dto)
      .eq('id', id)
      .select(COLS)
      .single();
    if (error) throw error;
    return data as Budget;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
  },

  async getProgress(budgetId: string, year: number, month: number): Promise<number> {
    const { data, error } = await supabase.rpc('get_budget_progress', {
      budget_id: budgetId,
      year,
      month,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
