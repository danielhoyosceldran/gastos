import { supabase } from '../../lib/supabase';
import { invalidateRefData } from '../../lib/refDataCache';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../../types/category.types';

const TABLE = 'categories';
const COLS = 'id,user_id,parent_id,name,color,icon,is_default,position,created_at,updated_at';

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLS)
      .order('position');
    if (error) throw error;
    return data as Category[];
  },

  async create(dto: CreateCategoryDTO): Promise<Category> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(dto)
      .select(COLS)
      .single();
    if (error) throw error;
    invalidateRefData();
    return data as Category;
  },

  async update(id: string, dto: UpdateCategoryDTO): Promise<Category> {
    if (dto.name !== undefined) {
      dto = { ...dto, is_default: false };
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update(dto)
      .eq('id', id)
      .select(COLS)
      .single();
    if (error) throw error;
    invalidateRefData();
    return data as Category;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    invalidateRefData();
  },

  async reorderAll(ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_items', { p_table: TABLE, p_ids: ids });
    if (error) throw error;
    invalidateRefData();
  },

  async getBudgetCount(id: string): Promise<number> {
    const { count, error } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    if (error) throw error;
    return count ?? 0;
  },
};
