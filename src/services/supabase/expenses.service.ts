import { supabase } from '../../lib/supabase';
import type { Expense, CreateExpenseDTO, UpdateExpenseDTO } from '../../types/expense.types';

const COLS = 'id,user_id,amount,currency,type,date,description,notes,category_id,payment_method_id,event_id,project_id,created_at,updated_at,expense_tags(tag_id)';

function mapRow(row: Record<string, unknown>): Expense {
  const tags = (row.expense_tags as Array<{ tag_id: string }> | null) ?? [];
  return {
    ...(row as Omit<Expense, 'tag_ids'>),
    tag_ids: tags.map((t) => t.tag_id),
  };
}

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select(COLS)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Record<string, unknown>[]).map(mapRow);
  },

  async getByMonth(year: number, month: number): Promise<Expense[]> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('expenses')
      .select(COLS)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Record<string, unknown>[]).map(mapRow);
  },

  async create(dto: CreateExpenseDTO): Promise<Expense> {
    const { tag_ids, ...rest } = dto;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...rest, user_id: user!.id })
      .select(COLS)
      .single();
    if (error) throw error;

    if (tag_ids?.length) {
      const { error: tagError } = await supabase
        .from('expense_tags')
        .insert(tag_ids.map((tag_id) => ({ expense_id: data.id, tag_id })));
      if (tagError) throw tagError;
    }

    return mapRow(data as Record<string, unknown>);
  },

  async update(id: string, dto: UpdateExpenseDTO): Promise<Expense> {
    const { tag_ids, ...rest } = dto;
    const { data, error } = await supabase
      .from('expenses')
      .update(rest)
      .eq('id', id)
      .select(COLS)
      .single();
    if (error) throw error;

    if (tag_ids !== undefined) {
      await supabase.from('expense_tags').delete().eq('expense_id', id);
      if (tag_ids.length) {
        const { error: tagError } = await supabase
          .from('expense_tags')
          .insert(tag_ids.map((tag_id) => ({ expense_id: id, tag_id })));
        if (tagError) throw tagError;
      }
    }

    return mapRow(data as Record<string, unknown>);
  },

  async getById(id: string): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .select(COLS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },
};
