export interface Category {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface CreateCategoryDTO {
  parent_id?: string | null;
  name: string;
  color?: string | null;
  icon?: string | null;
  position?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  color?: string | null;
  icon?: string | null;
  position?: number;
  is_default?: boolean;
}
