import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set in your environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to execute SQL
async function executeSQL(sql, description) {
  console.log(`Executing: ${description}...`);
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Error in ${description}:`, error);
      return false;
    }
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (error) {
    console.error(`Error in ${description}:`, error);
    return false;
  }
}

// Create the tables for AI decision engine
async function createTables() {
  // 1. Create ai_decisions table
  const createAiDecisionsTable = `
    CREATE TABLE IF NOT EXISTS public.ai_decisions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
      persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
      decision TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      persona_match INTEGER NOT NULL,
      reasoning TEXT NOT NULL,
      chain_of_thought TEXT,
      requires_recalculation BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id, proposal_id, persona_id)
    );
    
    -- Add RLS policies
    ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own AI decisions"
      ON public.ai_decisions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can insert their own AI decisions"
      ON public.ai_decisions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
      
    CREATE POLICY "Users can update their own AI decisions"
      ON public.ai_decisions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
      
    CREATE POLICY "Users can delete their own AI decisions"
      ON public.ai_decisions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  `;
  
  // 2. Create ai_decision_factors table
  const createAiDecisionFactorsTable = `
    CREATE TABLE IF NOT EXISTS public.ai_decision_factors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ai_decision_id UUID NOT NULL REFERENCES public.ai_decisions(id) ON DELETE CASCADE,
      factor_name TEXT NOT NULL,
      factor_value INTEGER NOT NULL,
      factor_weight INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Add RLS policies
    ALTER TABLE public.ai_decision_factors ENABLE ROW LEVEL SECURITY;
    
    -- Create policies (using join to check if the decision belongs to the user)
    CREATE POLICY "Users can view their own AI decision factors"
      ON public.ai_decision_factors
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ai_decisions
          WHERE ai_decisions.id = ai_decision_factors.ai_decision_id
          AND ai_decisions.user_id = auth.uid()
        )
      );
      
    CREATE POLICY "Users can insert their own AI decision factors"
      ON public.ai_decision_factors
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.ai_decisions
          WHERE ai_decisions.id = ai_decision_factors.ai_decision_id
          AND ai_decisions.user_id = auth.uid()
        )
      );
      
    CREATE POLICY "Users can update their own AI decision factors"
      ON public.ai_decision_factors
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ai_decisions
          WHERE ai_decisions.id = ai_decision_factors.ai_decision_id
          AND ai_decisions.user_id = auth.uid()
        )
      );
      
    CREATE POLICY "Users can delete their own AI decision factors"
      ON public.ai_decision_factors
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ai_decisions
          WHERE ai_decisions.id = ai_decision_factors.ai_decision_id
          AND ai_decisions.user_id = auth.uid()
        )
      );
  `;
  
  // 3. Create ai_processing_queue table
  const createAiProcessingQueueTable = `
    CREATE TABLE IF NOT EXISTS public.ai_processing_queue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      processed_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add RLS policies
    ALTER TABLE public.ai_processing_queue ENABLE ROW LEVEL SECURITY;
    
    -- Create a policy to allow service role to manage the queue
    CREATE POLICY "Service role can manage AI processing queue"
      ON public.ai_processing_queue
      FOR ALL
      TO service_role
      USING (true);
      
    -- Create a policy to allow authenticated users to view the queue
    CREATE POLICY "Authenticated users can view AI processing queue"
      ON public.ai_processing_queue
      FOR SELECT
      TO authenticated
      USING (true);
  `;
  
  // Execute all SQL statements
  const success1 = await executeSQL(createAiDecisionsTable, 'Creating ai_decisions table');
  const success2 = await executeSQL(createAiDecisionFactorsTable, 'Creating ai_decision_factors table');
  const success3 = await executeSQL(createAiProcessingQueueTable, 'Creating ai_processing_queue table');
  
  return success1 && success2 && success3;
}

// Create triggers for automatic recalculation
async function createTriggers() {
  // Trigger to mark decisions for recalculation when a persona is updated
  const createPersonaUpdateTrigger = `
    CREATE OR REPLACE FUNCTION mark_decisions_for_recalculation()
    RETURNS TRIGGER AS $$
    BEGIN
      -- If risk, esg, treasury, horizon, or frequency have changed
      IF OLD.risk != NEW.risk OR
         OLD.esg != NEW.esg OR
         OLD.treasury != NEW.treasury OR
         OLD.horizon != NEW.horizon OR
         OLD.frequency != NEW.frequency THEN
        
        -- Mark all decisions for this persona for recalculation
        UPDATE public.ai_decisions
        SET requires_recalculation = TRUE
        WHERE persona_id = NEW.id;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS persona_update_trigger ON public.personas;
    
    -- Create trigger
    CREATE TRIGGER persona_update_trigger
    AFTER UPDATE ON public.personas
    FOR EACH ROW
    EXECUTE FUNCTION mark_decisions_for_recalculation();
  `;
  
  // Execute the trigger creation
  return await executeSQL(createPersonaUpdateTrigger, 'Creating persona update trigger');
}

// Create helper functions for AI decision operations
async function createHelperFunctions() {
  // Function to get or create an AI decision
  const createGetOrCreateFunction = `
    CREATE OR REPLACE FUNCTION get_or_create_ai_decision(
      p_user_id UUID,
      p_proposal_id UUID,
      p_persona_id UUID
    )
    RETURNS SETOF ai_decisions
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_decision_id UUID;
      v_requires_recalc BOOLEAN;
    BEGIN
      -- Check if a decision already exists
      SELECT id, requires_recalculation 
      INTO v_decision_id, v_requires_recalc
      FROM public.ai_decisions
      WHERE user_id = p_user_id
        AND proposal_id = p_proposal_id
        AND persona_id = p_persona_id;
      
      -- If decision exists and doesn't need recalculation, return it
      IF v_decision_id IS NOT NULL AND NOT v_requires_recalc THEN
        RETURN QUERY SELECT * FROM public.ai_decisions WHERE id = v_decision_id;
        RETURN;
      END IF;
      
      -- If decision exists but needs recalculation, update requires_recalculation flag
      -- to prevent multiple recalculations
      IF v_decision_id IS NOT NULL THEN
        UPDATE public.ai_decisions
        SET requires_recalculation = FALSE
        WHERE id = v_decision_id;
      END IF;
      
      -- Return empty set since we need to generate a new decision
      -- The client should handle this by calling the AI service
      RETURN;
    END;
    $$;
  `;
  
  // Execute the function creation
  return await executeSQL(createGetOrCreateFunction, 'Creating AI decision helper functions');
}

// Main function to set up database
async function setup() {
  console.log('Setting up AI Decision Engine database...');
  
  // First, try to create the exec_sql function if it doesn't exist
  const createExecSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;
  
  // Try to execute directly
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createExecSqlFunction });
    if (error) {
      console.error('Error creating exec_sql function:', error);
      console.log('Attempting to create function directly...');
      
      // If fails, try to execute the SQL directly
      const { error: directError } = await supabase.from('supabase_functions').rpc('exec_sql', { 
        sql_query: createExecSqlFunction 
      });
      
      if (directError) {
        console.error('Failed to create exec_sql function:', directError);
        console.log('Please execute this SQL manually in the Supabase SQL editor:');
        console.log(createExecSqlFunction);
        return false;
      }
    }
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
    console.log('Please execute this SQL manually in the Supabase SQL editor:');
    console.log(createExecSqlFunction);
    return false;
  }
  
  // Create tables, triggers, and helper functions
  const tablesCreated = await createTables();
  const triggersCreated = await createTriggers();
  const functionsCreated = await createHelperFunctions();
  
  if (tablesCreated && triggersCreated && functionsCreated) {
    console.log('✅ AI Decision Engine database setup completed successfully!');
    return true;
  } else {
    console.error('❌ AI Decision Engine database setup failed.');
    return false;
  }
}

// Run the setup
setup().then(success => {
  if (success) {
    console.log('Database setup complete.');
  } else {
    console.log('Database setup encountered errors. Check the logs above.');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error during setup:', error);
  process.exit(1);
});
