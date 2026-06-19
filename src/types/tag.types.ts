export interface TagGroup {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  tag_group_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTagGroupDTO { name: string }
export interface UpdateTagGroupDTO { name?: string; position?: number }

export interface CreateTagDTO {
  tag_group_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string | null;
  icon?: string | null;
  position?: number;
  tag_group_id?: string;
  is_default?: boolean;
}
