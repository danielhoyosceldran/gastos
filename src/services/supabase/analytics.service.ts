import { supabase } from '../../lib/supabase';
import type { DimensionSlice, TrendPoint, AnalyticsDimension } from '../../types/analytics.types';

export const analyticsService = {
  async getByDimension(
    dimension: AnalyticsDimension,
    currency: string,
    from: string,
    to: string,
  ): Promise<DimensionSlice[]> {
    const { data, error } = await supabase.rpc('get_spending_by_dimension', {
      p_dimension: dimension,
      p_currency: currency,
      p_from: from,
      p_to: to,
    });
    if (error) throw error;
    return (data as DimensionSlice[]) ?? [];
  },

  async getOverTime(currency: string, from: string, to: string): Promise<TrendPoint[]> {
    const { data, error } = await supabase.rpc('get_spending_over_time', {
      p_currency: currency,
      p_from: from,
      p_to: to,
    });
    if (error) throw error;
    return (data as TrendPoint[]) ?? [];
  },
};
