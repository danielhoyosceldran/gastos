import { supabase } from '../../lib/supabase';
import { invalidateRefData } from '../../lib/refDataCache';
import type { PaymentMethod, CreatePaymentMethodDTO, UpdatePaymentMethodDTO } from '../../types/payment-method.types';

const TABLE = 'payment_methods';
const COLS = 'id,user_id,name,icon,is_default,position,created_at,updated_at';

export const paymentMethodsService = {
  async getAll(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase.from(TABLE).select(COLS).order('position');
    if (error) throw error;
    return data as PaymentMethod[];
  },

  async create(dto: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    const { data, error } = await supabase.from(TABLE).insert(dto).select(COLS).single();
    if (error) throw error;
    invalidateRefData();
    return data as PaymentMethod;
  },

  async update(id: string, dto: UpdatePaymentMethodDTO): Promise<PaymentMethod> {
    if (dto.name !== undefined) dto = { ...dto, is_default: false };
    const { data, error } = await supabase.from(TABLE).update(dto).eq('id', id).select(COLS).single();
    if (error) throw error;
    invalidateRefData();
    return data as PaymentMethod;
  },

  async delete(id: string): Promise<void> {
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
