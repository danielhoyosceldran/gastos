export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodDTO { name: string; icon?: string | null }
export interface UpdatePaymentMethodDTO { name?: string; icon?: string | null; position?: number; is_default?: boolean }
