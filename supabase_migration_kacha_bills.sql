-- Create kacha_bills table for rough bills, photo slips and notes
CREATE TABLE IF NOT EXISTS kacha_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id TEXT NOT NULL DEFAULT 'default-book',
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    title TEXT,
    note TEXT,
    amount NUMERIC,
    bill_date TIMESTAMPTZ DEFAULT now(),
    image_url TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED', 'CONVERTED')),
    converted_txn_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE kacha_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own kacha bills" 
ON kacha_bills FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kacha bills" 
ON kacha_bills FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kacha bills" 
ON kacha_bills FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own kacha bills" 
ON kacha_bills FOR DELETE 
USING (auth.uid() = user_id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_kacha_bills_user_book ON kacha_bills(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_kacha_bills_status ON kacha_bills(status);
CREATE INDEX IF NOT EXISTS idx_kacha_bills_date ON kacha_bills(bill_date DESC);
