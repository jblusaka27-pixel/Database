export interface Depot {
  id: string;
  name: string;
  created_at: string;
}

export interface CrateType {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface DailyClosing {
  id: string;
  depot_id: string;
  crate_type_id: string;
  closing_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface IncomingCrate {
  id: string;
  depot_id: string;
  crate_type_id: string;
  quantity: number;
  reason: string;
  notes: string | null;
  transaction_date: string;
  created_at: string;
}

export interface OutgoingCrate {
  id: string;
  depot_id: string;
  crate_type_id: string;
  quantity: number;
  reason: string;
  destination_info: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  from_depot_id: string;
  to_depot_id: string;
  crate_type_id: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  transfer_date: string;
  created_at: string;
}

export interface Customer {
  id: string;
  depot_id: string;
  name: string;
  status: 'active' | 'inactive';
  ledger_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedgerTransaction {
  id: string;
  customer_id: string;
  depot_id: string;
  crate_type_id: string;
  transaction_date: string;
  transaction_type: 'deposit' | 'withdrawal' | 'reversal';
  quantity: number;
  running_balance: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}
