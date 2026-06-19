import { supabase } from '../../lib/supabase';
import type { SupportedLanguage } from '../../lib/i18n';

export interface UpdateProfileDTO {
  language?: SupportedLanguage;
  currency?: string;
  primary_color?: 'blue' | 'green' | 'red';
  theme?: 'light' | 'dark';
}

export const profileService = {
  async update(id: string, dto: UpdateProfileDTO) {
    const { data, error } = await supabase
      .from('profiles')
      .update(dto)
      .eq('id', id)
      .select('id,email,language,currency,primary_color,theme,is_admin,approved')
      .single();
    if (error) throw error;
    return data;
  },

  async hasLiveBudgetsInCurrency(currency: string): Promise<boolean> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('budgets')
      .select('id,budget_type,ends_month,months')
      .eq('currency', currency);
    if (error) throw error;
    if (!data?.length) return false;

    return data.some((b) => {
      if (b.budget_type === 'total') return true;
      if (b.budget_type === 'range') return !b.ends_month || b.ends_month >= currentMonth;
      if (b.budget_type === 'months') {
        const months = (b.months as Array<{ year: number; month: number }>) ?? [];
        return months.some(
          (m) => `${m.year}-${String(m.month).padStart(2, '0')}` >= currentMonth
        );
      }
      return false;
    });
  },
};
