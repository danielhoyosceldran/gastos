import { supabase } from '../../lib/supabase';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '../../types/project.types';

const TABLE = 'projects';
const COLS = 'id,user_id,name,description,starts_at,ends_at,created_at,updated_at';

export const projectsService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase.from(TABLE).select(COLS).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Project[];
  },

  async create(dto: CreateProjectDTO): Promise<Project> {
    const { data, error } = await supabase.from(TABLE).insert(dto).select(COLS).single();
    if (error) throw error;
    return data as Project;
  },

  async update(id: string, dto: UpdateProjectDTO): Promise<Project> {
    const { data, error } = await supabase.from(TABLE).update(dto).eq('id', id).select(COLS).single();
    if (error) throw error;
    return data as Project;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async getBudgetCount(id: string): Promise<number> {
    const { count, error } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id);
    if (error) throw error;
    return count ?? 0;
  },
};
