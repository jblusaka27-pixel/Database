/*
  # Update Crate Types

  ## Changes
  - Remove "Shell Big" and "Shell Small"
  - Add "Shell 750ml", "Shell 660ml", "Shell 375ml", "Shell 330ml"
  - Keep "Shell Softies"
*/

DELETE FROM crate_types WHERE name = 'Shell Big';
DELETE FROM crate_types WHERE name = 'Shell Small';

INSERT INTO crate_types (name, sort_order) VALUES
  ('Shell 750ml', 6),
  ('Shell 660ml', 7),
  ('Shell 375ml', 8),
  ('Shell 330ml', 9),
  ('Shell Softies', 10)
ON CONFLICT (name) DO NOTHING;
