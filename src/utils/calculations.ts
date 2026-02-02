import { supabase } from '../lib/supabase';

export const calculateCurrentBalance = async (
  depotId: string,
  crateTypeId: string,
  asOfDate?: string
): Promise<number> => {
  const targetDate = asOfDate || new Date().toISOString().split('T')[0];

  const [closings, incoming, outgoing, transfersIn, transfersOut] = await Promise.all([
    supabase
      .from('daily_closings')
      .select('quantity, closing_date')
      .eq('depot_id', depotId)
      .eq('crate_type_id', crateTypeId)
      .lte('closing_date', targetDate)
      .order('closing_date', { ascending: false })
      .limit(1),
    supabase
      .from('incoming_crates')
      .select('quantity, transaction_date')
      .eq('depot_id', depotId)
      .eq('crate_type_id', crateTypeId)
      .lte('transaction_date', targetDate),
    supabase
      .from('outgoing_crates')
      .select('quantity, transaction_date')
      .eq('depot_id', depotId)
      .eq('crate_type_id', crateTypeId)
      .lte('transaction_date', targetDate),
    supabase
      .from('transfers')
      .select('quantity, transfer_date')
      .eq('to_depot_id', depotId)
      .eq('crate_type_id', crateTypeId)
      .lte('transfer_date', targetDate),
    supabase
      .from('transfers')
      .select('quantity, transfer_date')
      .eq('from_depot_id', depotId)
      .eq('crate_type_id', crateTypeId)
      .lte('transfer_date', targetDate),
  ]);

  const lastClosing = closings.data?.[0];
  const closingDate = lastClosing?.closing_date || '1900-01-01';
  const closingBalance = lastClosing?.quantity || 0;

  const incomingAfterClosing = incoming.data
    ?.filter((t) => t.transaction_date > closingDate)
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  const outgoingAfterClosing = outgoing.data
    ?.filter((t) => t.transaction_date > closingDate)
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  const transfersInAfterClosing = transfersIn.data
    ?.filter((t) => t.transfer_date > closingDate)
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  const transfersOutAfterClosing = transfersOut.data
    ?.filter((t) => t.transfer_date > closingDate)
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  const balance =
    closingBalance +
    incomingAfterClosing -
    outgoingAfterClosing +
    transfersInAfterClosing -
    transfersOutAfterClosing;

  return Math.max(0, balance);
};

export const getTodayTransactions = async (depotId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const [incoming, outgoing, transfersIn, transfersOut] = await Promise.all([
    supabase
      .from('incoming_crates')
      .select('quantity')
      .eq('depot_id', depotId)
      .eq('transaction_date', today),
    supabase
      .from('outgoing_crates')
      .select('quantity')
      .eq('depot_id', depotId)
      .eq('transaction_date', today),
    supabase
      .from('transfers')
      .select('quantity')
      .eq('to_depot_id', depotId)
      .eq('transfer_date', today),
    supabase
      .from('transfers')
      .select('quantity')
      .eq('from_depot_id', depotId)
      .eq('transfer_date', today),
  ]);

  return {
    incoming: incoming.data?.reduce((sum, t) => sum + t.quantity, 0) || 0,
    outgoing: outgoing.data?.reduce((sum, t) => sum + t.quantity, 0) || 0,
    transfersIn: transfersIn.data?.reduce((sum, t) => sum + t.quantity, 0) || 0,
    transfersOut: transfersOut.data?.reduce((sum, t) => sum + t.quantity, 0) || 0,
  };
};
