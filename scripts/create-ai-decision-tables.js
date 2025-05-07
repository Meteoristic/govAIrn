// Script to create AI decision tables in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set in your environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAIDecisionTables() {
  try {
    console.log('Creating AI decision tables...');
    
    // Check if tables already exist
    const { data: existingTables, error: tableError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .in('tablename', ['ai_decisions', 'ai_decision_factors', 'ai_processing_queue']);
    
    if (tableError) {
      console.error('Error checking existing tables:', tableError);
      return;
    }
    
    const existingTableNames = existingTables.map(t => t.tablename);
    console.log('Existing tables:', existingTableNames.join(', ') || 'none');
    
    // Create ai_decisions table if it doesn't exist
    if (!existingTableNames.includes('ai_decisions')) {
      console.log('Creating ai_decisions table...');
      
      const { error: createError } = await supabase.rpc('create_ai_decisions_table', {});
      
      if (createError) {
        console.error('Error creating ai_decisions table:', createError);
      } else {
        console.log('ai_decisions table created successfully');
      }
    } else {
      console.log('ai_decisions table already exists');
    }
    
    // Create ai_decision_factors table if it doesn't exist
    if (!existingTableNames.includes('ai_decision_factors')) {
      console.log('Creating ai_decision_factors table...');
      
      const { error: createError } = await supabase.rpc('create_ai_decision_factors_table', {});
      
      if (createError) {
        console.error('Error creating ai_decision_factors table:', createError);
      } else {
        console.log('ai_decision_factors table created successfully');
      }
    } else {
      console.log('ai_decision_factors table already exists');
    }
    
    // Create ai_processing_queue table if it doesn't exist
    if (!existingTableNames.includes('ai_processing_queue')) {
      console.log('Creating ai_processing_queue table...');
      
      const { error: createError } = await supabase.rpc('create_ai_processing_queue_table', {});
      
      if (createError) {
        console.error('Error creating ai_processing_queue table:', createError);
      } else {
        console.log('ai_processing_queue table created successfully');
      }
    } else {
      console.log('ai_processing_queue table already exists');
    }
    
    console.log('AI decision tables setup complete');
  } catch (error) {
    console.error('Error setting up AI decision tables:', error);
  }
}

// Create the required stored procedures
async function createStoredProcedures() {
  try {
    console.log('Creating stored procedures...');
    
    // Create the procedure for creating the ai_decisions table
    const createAiDecisionsTableSql = `
      CREATE OR REPLACE FUNCTION create_ai_decisions_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
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
      END;
      $$;
    `;
    
    // Create the procedure for creating the ai_decision_factors table
    const createAiDecisionFactorsTableSql = `
      CREATE OR REPLACE FUNCTION create_ai_decision_factors_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
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
      END;
      $$;
    `;
    
    // Create the procedure for creating the ai_processing_queue table
    const createAiProcessingQueueTableSql = `
      CREATE OR REPLACE FUNCTION create_ai_processing_queue_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
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
      END;
      $$;
    `;
    
    // Execute the SQL statements to create the procedures
    const { error: proc1Error } = await supabase.rpc('exec_sql', { sql: createAiDecisionsTableSql });
    if (proc1Error) {
      console.error('Error creating ai_decisions table procedure:', proc1Error);
    } else {
      console.log('ai_decisions table procedure created successfully');
    }
    
    const { error: proc2Error } = await supabase.rpc('exec_sql', { sql: createAiDecisionFactorsTableSql });
    if (proc2Error) {
      console.error('Error creating ai_decision_factors table procedure:', proc2Error);
    } else {
      console.log('ai_decision_factors table procedure created successfully');
    }
    
    const { error: proc3Error } = await supabase.rpc('exec_sql', { sql: createAiProcessingQueueTableSql });
    if (proc3Error) {
      console.error('Error creating ai_processing_queue table procedure:', proc3Error);
    } else {
      console.log('ai_processing_queue table procedure created successfully');
    }
    
    // Create a helper function for executing SQL
    const execSqlProcSql = `
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
    
    const { error: execSqlError } = await supabase.rpc('exec_sql', { sql: execSqlProcSql });
    if (execSqlError) {
      console.error('Error creating exec_sql procedure:', execSqlError);
    } else {
      console.log('exec_sql procedure created successfully');
    }
    
  } catch (error) {
    console.error('Error creating stored procedures:', error);
  }
}

// Run both functions
async function main() {
  await createStoredProcedures();
  await createAIDecisionTables();
  console.log('Script execution completed');
}

main().catch(console.error);
