import { supabase } from '../../lib/supabase';
import { invalidateRefData } from '../../lib/refDataCache';
import type { Event, CreateEventDTO, UpdateEventDTO } from '../../types/event.types';

const TABLE = 'events';
const COLS = 'id,user_id,name,description,starts_at,ends_at,created_at,updated_at';

export const eventsService = {
  async getAll(): Promise<Event[]> {
    const { data, error } = await supabase.from(TABLE).select(COLS).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Event[];
  },

  async create(dto: CreateEventDTO): Promise<Event> {
    const { data, error } = await supabase.from(TABLE).insert(dto).select(COLS).single();
    if (error) throw error;
    invalidateRefData();
    return data as Event;
  },

  async update(id: string, dto: UpdateEventDTO): Promise<Event> {
    const { data, error } = await supabase.from(TABLE).update(dto).eq('id', id).select(COLS).single();
    if (error) throw error;
    invalidateRefData();
    return data as Event;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    invalidateRefData();
  },

  async getBudgetCount(id: string): Promise<number> {
    const { count, error } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id);
    if (error) throw error;
    return count ?? 0;
  },
};
