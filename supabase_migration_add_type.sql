-- Add type column to customers table for Supplier support
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'CUSTOMER';

-- Optional: Update existing records to be CUSTOMER if null
UPDATE customers SET type = 'CUSTOMER' WHERE type IS NULL;
