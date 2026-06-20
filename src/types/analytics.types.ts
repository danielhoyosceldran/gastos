export interface DimensionSlice {
  dimension_id: string;
  name: string;
  total: number;
}

export interface TrendPoint {
  year: number;
  month: number;
  spent: number;
  income: number;
}

export type AnalyticsDimension = 'category' | 'tag' | 'project' | 'event';
