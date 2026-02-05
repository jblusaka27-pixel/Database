import { supabase } from '../lib/supabase';

export const getCustomerBalance = async (
  customerId: string,
  crateTypeId: string,
  asOfDate?: string
): Promise<number> => {
  const targetDate = asOfDate || new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('customer_ledger_transactions')
      .select('quantity, transaction_type')
      .eq('customer_id', customerId)
      .eq('crate_type_id', crateTypeId)
      .lte('transaction_date', targetDate);

    if (error || !data) return 0;

    let balance = 0;
    data.forEach((tx) => {
      if (tx.transaction_type === 'deposit') {
        balance += tx.quantity;
      } else if (tx.transaction_type === 'withdrawal') {
        balance -= tx.quantity;
      }
    });

    return Math.max(0, balance);
  } catch (error) {
    console.error('Error calculating customer balance:', error);
    return 0;
  }
};

export const getCustomerAllBalances = async (
  customerId: string,
  crateTypeIds: string[],
  asOfDate?: string
): Promise<Record<string, number>> => {
  const balances: Record<string, number> = {};

  try {
    const promises = crateTypeIds.map((id) =>
      getCustomerBalance(customerId, id, asOfDate)
    );
    const results = await Promise.all(promises);

    crateTypeIds.forEach((id, index) => {
      balances[id] = results[index];
    });

    return balances;
  } catch (error) {
    console.error('Error getting customer balances:', error);
    return balances;
  }
};

export const getCustomerTransactionHistory = async (
  customerId: string,
  crateTypeId?: string
) => {
  try {
    let query = supabase
      .from('customer_ledger_transactions')
      .select('*')
      .eq('customer_id', customerId);

    if (crateTypeId) {
      query = query.eq('crate_type_id', crateTypeId);
    }

    const { data, error } = await query.order('transaction_date', {
      ascending: false,
    });

    if (error || !data) return [];
    return data;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
};

export const getTotalCustomerCrates = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('customer_ledger_transactions')
      .select('quantity, transaction_type');

    if (error || !data) return 0;

    let total = 0;
    data.forEach((tx) => {
      if (tx.transaction_type === 'deposit') {
        total += tx.quantity;
      } else if (tx.transaction_type === 'withdrawal') {
        total -= tx.quantity;
      }
    });

    return Math.max(0, total);
  } catch (error) {
    console.error('Error calculating total crates:', error);
    return 0;
  }
};

export const validateCustomerBalance = async (
  customerId: string,
  crateTypeId: string,
  quantity: number
): Promise<{ valid: boolean; currentBalance: number; message?: string }> => {
  const currentBalance = await getCustomerBalance(customerId, crateTypeId);

  if (currentBalance < quantity) {
    return {
      valid: false,
      currentBalance,
      message: `Insufficient balance. Current: ${currentBalance}, Required: ${quantity}`,
    };
  }

  return { valid: true, currentBalance };
};
