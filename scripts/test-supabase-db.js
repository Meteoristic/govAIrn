import { createClient } from '@supabase/supabase-js';

// Create a direct connection to Supabase for testing
// Using the correct API key from the app
const supabaseUrl = 'https://ebchyxgtnyhvvwhzsmrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViY2h5eGd0bnlodnZ3aHpzbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTIxMjMsImV4cCI6MjA2MTg4ODEyM30.k9PZ2qdqmBkTPX7Bl8tT986KoJeVxVwzMeLepSDVe8Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🧪 TESTING SUPABASE CONNECTION AND ACCESS');
  console.log('=======================================');
  
  try {
    // 1. Test connection by querying a simple table
    console.log('\n1. Testing database connection...');
    const { data: daos, error: daoError } = await supabase
      .from('daos')
      .select('count');
    
    if (daoError) {
      console.error('❌ Error connecting to daos table:', daoError);
    } else {
      console.log('✅ Successfully connected to database');
      console.log(`   Found ${daos[0]?.count || 0} DAOs in the database`);
    }
    
    // 2. Test inserting a test record
    console.log('\n2. Testing write access with test DAO...');
    const testId = `test-dao-${Date.now()}`;
    const { data: insertedDao, error: insertError } = await supabase
      .from('daos')
      .insert({
        id: testId,
        name: 'Test DAO',
        description: 'This is a test DAO to verify database access',
        platform: 'Test',
        is_base_ecosystem: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting test DAO:', insertError);
      console.log('   This suggests there may be permission issues or column constraints');
    } else {
      console.log('✅ Successfully inserted test DAO');
      console.log('   Test DAO data:', insertedDao);
      
      // Clean up the test record
      console.log('\n3. Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('daos')
        .delete()
        .eq('id', testId);
        
      if (deleteError) {
        console.error('❌ Error cleaning up test DAO:', deleteError);
      } else {
        console.log('✅ Successfully cleaned up test DAO');
      }
    }
    
    // 3. List the columns in the daos table to verify schema
    console.log('\n4. Checking daos table schema...');
    const { data: exampleDao, error: exampleError } = await supabase
      .from('daos')
      .select('*')
      .limit(1)
      .single();
    
    if (exampleError) {
      console.error('❌ Error fetching sample DAO for schema check:', exampleError);
    } else {
      console.log('✅ DAOs table schema:');
      console.log(Object.keys(exampleDao).map(key => `   - ${key}: ${typeof exampleDao[key]}`));
    }
    
    console.log('\n5. Verify is_base_ecosystem column exists...');
    // Try to specifically select the is_base_ecosystem column
    const { data: baseEcosystemCheck, error: baseEcosystemError } = await supabase
      .from('daos')
      .select('is_base_ecosystem')
      .limit(1);
      
    if (baseEcosystemError) {
      console.error('❌ Error accessing is_base_ecosystem column:', baseEcosystemError);
    } else {
      console.log('✅ is_base_ecosystem column exists and is accessible');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during Supabase tests:', error);
  }
}

// Run the tests
testSupabaseConnection().catch(console.error);
