import { supabase } from '../../lib/supabase';
import { invalidateRefData } from '../../lib/refDataCache';
import type { TagGroup, CreateTagGroupDTO, UpdateTagGroupDTO } from '../../types/tag.types';

const TABLE = 'tag_groups';
const COLS = 'id,user_id,name,position,created_at,updated_at';

export const tagGroupsService = {
  async getAll(): Promise<TagGroup[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLS)
      .order('position');
    if (error) throw error;
    return data as TagGroup[];
  },

  async create(dto: CreateTagGroupDTO): Promise<TagGroup> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(dto)
      .select(COLS)
      .single();
    if (error) throw error;
    invalidateRefData();
    return data as TagGroup;
  },

  async update(id: string, dto: UpdateTagGroupDTO): Promise<TagGroup> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(dto)
      .eq('id', id)
      .select(COLS)
      .single();
    if (error) throw error;
    invalidateRefData();
    return data as TagGroup;
  },

  async delete(id: string, ungroupedId: string): Promise<void> {
    // Reassign all tags to ungrouped before deleting
    const { error: reassignError } = await supabase
      .from('tags')
      .update({ tag_group_id: ungroupedId })
      .eq('tag_group_id', id);
    if (reassignError) throw reassignError;

    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    invalidateRefData();
  },

  async reorderAll(ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_items', { p_table: TABLE, p_ids: ids });
    if (error) throw error;
    invalidateRefData();
  },
};
