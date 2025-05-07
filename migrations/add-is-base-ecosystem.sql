-- Add is_base_ecosystem column to daos table
ALTER TABLE daos ADD COLUMN IF NOT EXISTS is_base_ecosystem BOOLEAN DEFAULT FALSE;
