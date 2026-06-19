import { supabase } from '../../lib/supabase';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../../types/tag.types';

const TABLE = 'tags';
const COLS = 'id,user_id,tag_group_id,name,color,icon,is_default,position,created_at,updated_at';

export const tagsService = {
  async getAll(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLS)
      .order('position');
    if (error) throw error;
    return data as Tag[];
  },

  async create(dto: CreateTagDTO): Promise<Tag> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(dto)
      .select(COLS)
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async update(id: string, dto: UpdateTagDTO): Promise<Tag> {
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
    return data as Tag;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async reorder(id: string, position: number): Promise<void> {
    const { error } = await supabase.from(TABLE).update({ position }).eq('id', id);
    if (error) throw error;
  },
};
