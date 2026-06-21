-- TEMP migration: drop the unused reference_price column from inventory_products.
-- Run once against the dev Supabase project to bring it in line with the updated
-- inventory_schema.sql (which no longer creates this column). Safe to delete this
-- file afterwards.

ALTER TABLE inventory_products DROP COLUMN IF EXISTS reference_price;
