import { createClient } from '@supabase/supabase-js';

// Configure Supabase client - using same config as in our app
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://glggdwdtbetczwdfanfb.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZ2dkd2R0YmV0Y3p3ZGZhbmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NTY4NTUsImV4cCI6MjAxODUzMjg1NX0.Jn9D0AhKisMDvRqb9T4mIcULxDfTNYJ2U-_nOGjBjUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addMissingColumn() {
  console.log('Adding missing is_base_ecosystem column to daos table...');
  
  try {
    // Check if the column already exists to avoid errors
    const { data: columns, error: checkError } = await supabase
      .rpc('get_columns_for_table', { table_name: 'daos' });
    
    if (checkError) {
      console.error('Error checking columns:', checkError);
      return;
    }
    
    const hasBaseEcosystemColumn = columns.some(col => col.column_name === 'is_base_ecosystem');
    
    if (hasBaseEcosystemColumn) {
      console.log('Column is_base_ecosystem already exists.');
      return;
    }
    
    // Add the column if it doesn't exist
    const { error } = await supabase
      .rpc('execute_sql', { 
        sql: 'ALTER TABLE daos ADD COLUMN IF NOT EXISTS is_base_ecosystem BOOLEAN DEFAULT false'
      });
    
    if (error) {
      console.error('Error adding column:', error);
    } else {
      console.log('Successfully added is_base_ecosystem column to daos table');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
addMissingColumn().catch(console.error);
