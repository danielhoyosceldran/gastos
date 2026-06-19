export interface Event {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventDTO {
  name: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface UpdateEventDTO {
  name?: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}
