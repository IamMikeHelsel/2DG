-- Database schema for 2DGameDemo persistence system
-- Using Supabase (PostgreSQL) with auth integration

-- Enable RLS (Row Level Security)
SET statement_timeout = 0;

-- Accounts table (managed by Supabase Auth)
-- We'll use auth.users table from Supabase directly

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    x FLOAT NOT NULL DEFAULT 43.2,
    y FLOAT NOT NULL DEFAULT 52.8,
    dir INTEGER NOT NULL DEFAULT 0,
    hp INTEGER NOT NULL DEFAULT 100,
    max_hp INTEGER NOT NULL DEFAULT 100,
    gold INTEGER NOT NULL DEFAULT 20,
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Founder rewards fields
    founder_tier VARCHAR(20) NOT NULL DEFAULT 'none',
    join_timestamp BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
    bug_reports INTEGER NOT NULL DEFAULT 0,
    referrals_count INTEGER NOT NULL DEFAULT 0,
    anniversary_participated BOOLEAN NOT NULL DEFAULT FALSE,
    display_title VARCHAR(100) DEFAULT '',
    chat_color VARCHAR(7) DEFAULT '#FFFFFF',
    
    CONSTRAINT characters_name_unique_per_user UNIQUE(user_id, name),
    CONSTRAINT characters_name_length CHECK (length(name) >= 1 AND length(name) <= 50),
    CONSTRAINT characters_position_valid CHECK (x >= 0 AND y >= 0),
    CONSTRAINT characters_hp_valid CHECK (hp >= 0 AND hp <= max_hp)
);

-- Inventories table (for future expansion)
CREATE TABLE IF NOT EXISTS inventories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT inventories_unique_slot UNIQUE(character_id, slot_index),
    CONSTRAINT inventories_quantity_positive CHECK (quantity > 0)
);

-- Items table (basic item definitions)
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'consumable',
    description TEXT DEFAULT '',
    stack_size INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT items_stack_size_positive CHECK (stack_size > 0)
);

-- Character unlocked rewards (for founder rewards system)
CREATE TABLE IF NOT EXISTS character_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    reward_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT character_rewards_unique UNIQUE(character_id, reward_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at ON characters(updated_at);
CREATE INDEX IF NOT EXISTS idx_inventories_character_id ON inventories(character_id);
CREATE INDEX IF NOT EXISTS idx_character_rewards_character_id ON character_rewards(character_id);

-- Row Level Security (RLS) policies
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_rewards ENABLE ROW LEVEL SECURITY;

-- Characters policies
CREATE POLICY "Users can view their own characters" ON characters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own characters" ON characters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters" ON characters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters" ON characters
    FOR DELETE USING (auth.uid() = user_id);

-- Inventories policies
CREATE POLICY "Users can manage their character inventories" ON inventories
    FOR ALL USING (
        character_id IN (
            SELECT id FROM characters WHERE user_id = auth.uid()
        )
    );

-- Character rewards policies
CREATE POLICY "Users can view their character rewards" ON character_rewards
    FOR SELECT USING (
        character_id IN (
            SELECT id FROM characters WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service can manage character rewards" ON character_rewards
    FOR ALL USING (true); -- This will be restricted by service role

-- Insert default items
INSERT INTO items (id, name, type, description, stack_size) VALUES
    ('pot_small', 'Small Potion', 'consumable', 'Restores a small amount of health', 10)
ON CONFLICT (id) DO NOTHING;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_characters_updated_at 
    BEFORE UPDATE ON characters 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_inventories_updated_at 
    BEFORE UPDATE ON inventories 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();