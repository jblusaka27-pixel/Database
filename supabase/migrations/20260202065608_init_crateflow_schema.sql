/*
  # CrateFlow Pro - Complete Schema
  
  ## Tables
  - depots: Locations tracking crates
  - crate_types: Types of crates available
  - daily_closings: End-of-day inventory counts
  - incoming_crates: Stock received
  - outgoing_crates: Stock distributed
  - transfers: Inter-depot movements
  - audit_log: Change history
*/

CREATE TABLE IF NOT EXISTS depots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crate_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  crate_type_id uuid NOT NULL REFERENCES crate_types(id) ON DELETE CASCADE,
  closing_date date NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(depot_id, crate_type_id, closing_date)
);

CREATE TABLE IF NOT EXISTS incoming_crates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  crate_type_id uuid NOT NULL REFERENCES crate_types(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outgoing_crates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  crate_type_id uuid NOT NULL REFERENCES crate_types(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  destination_info text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  to_depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  crate_type_id uuid NOT NULL REFERENCES crate_types(id) ON DELETE CASCADE,
  transfer_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  CHECK (from_depot_id != to_depot_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_closings_depot_date ON daily_closings(depot_id, closing_date);
CREATE INDEX IF NOT EXISTS idx_incoming_depot_date ON incoming_crates(depot_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_outgoing_depot_date ON outgoing_crates(depot_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transfers_from_date ON transfers(from_depot_id, transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfers_to_date ON transfers(to_depot_id, transfer_date);

ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE crate_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_crates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_crates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on depots" ON depots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crate_types" ON crate_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_closings" ON daily_closings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on incoming_crates" ON incoming_crates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on outgoing_crates" ON outgoing_crates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on transfers" ON transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);

INSERT INTO depots (name) VALUES ('Chelstone Depot'), ('Roma Depot') ON CONFLICT (name) DO NOTHING;
INSERT INTO crate_types (name, sort_order) VALUES 
  ('750ml', 1), ('660ml', 2), ('375ml', 3), ('330ml', 4), 
  ('Softies', 5), ('Shell Big', 6), ('Shell Small', 7)
ON CONFLICT (name) DO NOTHING;
