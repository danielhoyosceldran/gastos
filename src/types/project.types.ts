export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectDTO {
  name: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}
