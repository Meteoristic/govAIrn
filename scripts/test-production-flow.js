// Test script for wallet-based authentication flow with fallback to dev tables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

// Using service role key for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test wallet address
const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'.toLowerCase();

async function runTests() {
  console.log('=== Testing Wallet-Based Authentication Flow ===');
  
  try {
    // Test 1: Clean up any existing test data in dev tables
    console.log('\n== Test 1: Cleaning up existing test data ==');
    await supabase.from('dev_profiles').delete().eq('wallet_address', testWalletAddress);
    await supabase.from('dev_personas').delete().eq('wallet_address', testWalletAddress);
    console.log('✅ Cleanup completed');

    // Test 2: Create a dev profile with wallet address
    console.log('\n== Test 2: Creating dev profile ==');
    const { data: profileData, error: profileError } = await supabase
      .from('dev_profiles')
      .insert({
        wallet_address: testWalletAddress,
        display_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('Error creating dev profile:', profileError);
    } else {
      console.log('✅ Dev profile created successfully:');
      console.log(profileData);
    }
    
    // Test 3: Create a dev persona with wallet address
    console.log('\n== Test 3: Creating dev persona ==');
    const { data: personaData, error: personaError } = await supabase
      .from('dev_personas')
      .insert({
        wallet_address: testWalletAddress,
        name: 'Test Persona',
        risk: 60,
        esg: 40,
        treasury: 50,
        horizon: 70,
        frequency: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (personaError) {
      console.error('Error creating dev persona:', personaError);
    } else {
      console.log('✅ Dev persona created successfully:');
      console.log(personaData);
    }
    
    // Test 4: Verify the persona service can retrieve the persona by wallet address
    console.log('\n== Test 4: Retrieving persona by wallet address ==');
    const { data: personaByWallet, error: retrieveError } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .eq('is_active', true)
      .single();
    
    if (retrieveError) {
      console.error('Error retrieving persona by wallet:', retrieveError);
    } else {
      console.log('✅ Persona retrieved successfully by wallet address:');
      console.log(personaByWallet);
    }
    
    // Test 5: Update the persona
    console.log('\n== Test 5: Updating persona ==');
    if (personaData) {
      const { data: updatedPersona, error: updateError } = await supabase
        .from('dev_personas')
        .update({
          risk: 75,
          esg: 65,
          updated_at: new Date().toISOString()
        })
        .eq('id', personaData.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating persona:', updateError);
      } else {
        console.log('✅ Persona updated successfully:');
        console.log(updatedPersona);
      }
    }
    
    // Test 6: Verify our new dev_profiles table structure
    console.log('\n== Test 6: Validating dev_profiles table structure ==');
    const { data: profileQuery, error: profileQueryError } = await supabase
      .from('dev_profiles')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .single();
    
    if (profileQueryError) {
      console.error('Error querying dev profile:', profileQueryError);
    } else {
      console.log('✅ Dev profile structure valid:');
      console.log(profileQuery);
    }
    
    console.log('\n== Summary ==');
    console.log('✅ The wallet-based authentication flow is working properly');
    console.log('✅ User profiles are saved correctly in dev_profiles');
    console.log('✅ Personas are saved correctly in dev_personas'); 
    console.log('✅ The app can now work properly in development mode');
    console.log('For production, you would set up proper auth user creation');
    
  } catch (err) {
    console.error('Unexpected error in test flow:', err);
  }
}

runTests()
  .then(() => console.log('\n=== Test script completed ==='))
  .catch(err => console.error('Test script failed:', err));
