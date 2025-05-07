-- Create stored procedures for table initialization
-- These functions will be called from the client to set up tables if they don't exist

-- Function to create profiles table
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
    -- Create profiles table
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      wallet_address TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );

    -- Set up RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view any profile" ON profiles
      FOR SELECT USING (true);
      
    CREATE POLICY "Users can update their own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
      
    -- Create function to handle profile updates
    CREATE OR REPLACE FUNCTION handle_profile_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- Create trigger for profile updates
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION handle_profile_update();
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to create daos table
CREATE OR REPLACE FUNCTION create_daos_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'daos') THEN
    -- Create daos table
    CREATE TABLE daos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      chain_id TEXT,
      contract_address TEXT,
      proposal_count INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      total_value_locked NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );

    -- Set up RLS
    ALTER TABLE daos ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view any dao" ON daos
      FOR SELECT USING (true);
      
    -- Create function to handle dao updates
    CREATE OR REPLACE FUNCTION handle_dao_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- Create trigger for dao updates
    CREATE TRIGGER update_daos_updated_at
      BEFORE UPDATE ON daos
      FOR EACH ROW
      EXECUTE FUNCTION handle_dao_update();
    
    -- Add some sample data
    INSERT INTO daos (name, description, logo_url, chain_id, contract_address, proposal_count, member_count, total_value_locked)
    VALUES 
      ('Uniswap', 'Decentralized protocol for automated token exchange on Ethereum', 'https://cryptologos.cc/logos/uniswap-uni-logo.png', '1', '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 156, 72453, 632000000),
      ('Aave', 'Open source liquidity protocol for earning interest and borrowing assets', 'https://cryptologos.cc/logos/aave-aave-logo.png', '1', '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', 84, 41235, 580000000),
      ('Compound', 'Algorithmic money markets on the Ethereum blockchain', 'https://cryptologos.cc/logos/compound-comp-logo.png', '1', '0xc00e94cb662c3520282e6f5717214004a7f26888', 64, 35891, 310000000);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to create proposals table
CREATE OR REPLACE FUNCTION create_proposals_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'proposals') THEN
    -- Create proposals table
    CREATE TABLE proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dao_id UUID NOT NULL REFERENCES daos(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      creator_address TEXT NOT NULL,
      proposal_id TEXT,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      end_date TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT DEFAULT 'active',
      votes_for INTEGER DEFAULT 0,
      votes_against INTEGER DEFAULT 0,
      votes_abstain INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );

    -- Set up RLS
    ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view any proposal" ON proposals
      FOR SELECT USING (true);
      
    -- Create function to handle proposal updates
    CREATE OR REPLACE FUNCTION handle_proposal_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- Create trigger for proposal updates
    CREATE TRIGGER update_proposals_updated_at
      BEFORE UPDATE ON proposals
      FOR EACH ROW
      EXECUTE FUNCTION handle_proposal_update();
    
    -- Add some sample data
    INSERT INTO proposals (dao_id, title, description, creator_address, start_date, end_date, status, votes_for, votes_against, votes_abstain)
    VALUES 
      ((SELECT id FROM daos WHERE name = 'Uniswap' LIMIT 1), 'UIP-9: Fee Structure Update', 'Proposal to update the fee structure for low-cap pairs to optimize liquidity', '0x3d7e552c3e677c1a0a5c10a6206519aee881c2b7', NOW(), NOW() + INTERVAL '7 days', 'active', 1254322, 891233, 34521),
      ((SELECT id FROM daos WHERE name = 'Aave' LIMIT 1), 'AIP-42: Add support for OP token', 'Enable OP token as collateral', '0x9115d648a8bb21c67b5d4b8c31aa213ca9583e0b', NOW(), NOW() + INTERVAL '5 days', 'active', 983427, 124532, 21532),
      ((SELECT id FROM daos WHERE name = 'Compound' LIMIT 1), 'Compound Governance Proposal 135', 'Parameter updates for DAI', '0x5d8908afee1df9f7f0830105f8be828f97ce9e68', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', 'passed', 2345211, 342532, 19876);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to create votes table
CREATE OR REPLACE FUNCTION create_votes_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'votes') THEN
    -- Create votes table
    CREATE TABLE votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      vote TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
      voting_power NUMERIC DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(proposal_id, user_id)
    );

    -- Set up RLS
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view any vote" ON votes
      FOR SELECT USING (true);
      
    CREATE POLICY "Users can only insert their own votes" ON votes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
      
    CREATE POLICY "Users can only update their own votes" ON votes
      FOR UPDATE USING (auth.uid() = user_id);
      
    -- Create function to handle vote updates
    CREATE OR REPLACE FUNCTION handle_vote_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- Create trigger for vote updates
    CREATE TRIGGER update_votes_updated_at
      BEFORE UPDATE ON votes
      FOR EACH ROW
      EXECUTE FUNCTION handle_vote_update();
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to create personas table
CREATE OR REPLACE FUNCTION create_personas_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'personas') THEN
    -- Create personas table
    CREATE TABLE personas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      risk_tolerance INTEGER CHECK (risk_tolerance BETWEEN 1 AND 10),
      time_preference INTEGER CHECK (time_preference BETWEEN 1 AND 10),
      tech_focus INTEGER CHECK (tech_focus BETWEEN 1 AND 10),
      decentralization INTEGER CHECK (decentralization BETWEEN 1 AND 10),
      sustainability INTEGER CHECK (sustainability BETWEEN 1 AND 10),
      governance INTEGER CHECK (governance BETWEEN 1 AND 10),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(user_id, name)
    );

    -- Set up RLS
    ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own personas" ON personas
      FOR SELECT USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can insert their own personas" ON personas
      FOR INSERT WITH CHECK (auth.uid() = user_id);
      
    CREATE POLICY "Users can update their own personas" ON personas
      FOR UPDATE USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can delete their own personas" ON personas
      FOR DELETE USING (auth.uid() = user_id);
      
    -- Create function to handle persona updates
    CREATE OR REPLACE FUNCTION handle_persona_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- Create trigger for persona updates
    CREATE TRIGGER update_personas_updated_at
      BEFORE UPDATE ON personas
      FOR EACH ROW
      EXECUTE FUNCTION handle_persona_update();
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add a function to setup all tables at once
CREATE OR REPLACE FUNCTION setup_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_profiles_table();
  RETURN TRUE;
END;
$$;
