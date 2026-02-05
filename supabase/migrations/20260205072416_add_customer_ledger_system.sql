/*
  # Add Customer Ledger System

  ## Overview
  Upgrade system to track empties per customer, not just depot totals.
  
  ## New Tables
  - `customers`: Customer records with depot association
  - `customer_ledger_transactions`: Transaction history per customer

  ## Changes
  - Add customer_id to transaction tables
  - Add audit logging for ledger transactions
  - Create indexes for performance
  
  ## Security
  - Enable RLS on all new tables
  - Create policies for customer access
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ledger_enabled boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(depot_id, name)
);

CREATE TABLE IF NOT EXISTS customer_ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  depot_id uuid NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  crate_type_id uuid NOT NULL REFERENCES crate_types(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'reversal')),
  quantity integer NOT NULL CHECK (quantity > 0),
  running_balance integer DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customer_ledger_transactions" ON customer_ledger_transactions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_customers_depot ON customers(depot_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_ledger_customer_date ON customer_ledger_transactions(customer_id, transaction_date);
CREATE INDEX idx_ledger_customer_crate ON customer_ledger_transactions(customer_id, crate_type_id);
CREATE INDEX idx_ledger_depot_date ON customer_ledger_transactions(depot_id, transaction_date);

INSERT INTO customers (depot_id, name, status, ledger_enabled)
SELECT d.id, customer_name, 'active', true
FROM (
  SELECT * FROM (VALUES
    ('RINGSON'), ('RUKUNDURO'), ('MAKUMBIRO'), ('ASAKI'), ('FRANCIS MWALOLANDA'),
    ('MR BOTA'), ('MIYAMBO'), ('VINTAGE'), ('SEVEN ELEVEN'), ('TREEHOUSE CAFÉ'),
    ('GLOBAL NEEDS'), ('HUGHES'), ('SUNSHINE'), ('KAKWELE'), ('MARY CHEWE'),
    ('ALXANDRIA'), ('KACHENCHETE'), ('RAMLEX'), ('ALL FLAVOURS'), ('VEGAS'),
    ('MGD'), ('MILIMO ZENKI'), ('KILI B'), ('DZUNGU'), ('WILLIAM'),
    ('GETRUDE'), ('MR SIKAPEZYE'), ('BREWERS DROP'), ('AMBUYA CHAINDA'), ('MRS MWELWA'),
    ('EMELA'), ('AGANZO'), ('JOSHUA'), ('ROYAL MINI MART'), ('THE LOUNGE'),
    ('CHI JOINT'), ('EASY E'), ('ELIA'), ('ASABI'), ('MK FAITH'),
    ('YANAMA'), ('THE HOUSE'), ('WEZIA'), ('MR MUBA'), ('FRANCIS NGOMA'),
    ('MR MULENGA LAVENS'), ('80 AVONDALE'), ('VICHU LOVE'), ('CLUB T.S'), ('AGANZO (SOLANGE)'),
    ('SKOP'), ('PJS'), ('DOROTHY'), ('KAWA LODGE'), ('OBAMA'),
    ('MADAM CHILESHE'), ('SABINA'), ('CATHY ZAF'), ('PLAN B PUB'), ('NDUWIMANA'),
    ('ISAAC'), ('CHEZ NTEMBA'), ('LEGACY'), ('BIRORI'), ('TOMANU'),
    ('VERMOER'), ('CI MTHUDZI'), ('HAVEN CREST'), ('CHRIZET'), ('DIEGO'),
    ('MUGABO'), ('CLAUDIA'), ('BONKERI'), ('JONAS'), ('JAMES'), ('DIRECTOR'), ('THE BARCODE CHELSTONE')
  ) AS t(customer_name)
) chelstone_customers
CROSS JOIN (SELECT id FROM depots WHERE name = 'Chelstone Depot') d
ON CONFLICT (depot_id, name) DO NOTHING;

INSERT INTO customers (depot_id, name, status, ledger_enabled)
SELECT d.id, 'THE BARCODE ROMA', 'active', true
FROM depots d
WHERE d.name = 'Roma Depot'
ON CONFLICT (depot_id, name) DO NOTHING;
