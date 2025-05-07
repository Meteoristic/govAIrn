// Test script for development mode authentication flow with dev tables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Using service role key for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test wallet address
const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'.toLowerCase();

async function runTests() {
  console.log('=== Testing Development Mode Flow with Dev Tables ===');
  
  try {
    // Clear any existing test data
    console.log('\n== Cleaning up existing test data ==');
    await supabase.from('dev_profiles').delete().eq('wallet_address', testWalletAddress);
    await supabase.from('dev_personas').delete().eq('wallet_address', testWalletAddress);
    console.log('Cleanup completed');

    // Test 1: Create user profile in dev_profiles
    console.log('\n== Test 1: Create user profile in dev_profiles ==');
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
    
    // Test 2: Create persona in dev_personas
    console.log('\n== Test 2: Create persona in dev_personas ==');
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
    
    // Test 3: Verify we can query the profile by wallet address
    console.log('\n== Test 3: Query profile by wallet address ==');
    const { data: profileQuery, error: profileQueryError } = await supabase
      .from('dev_profiles')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .single();
    
    if (profileQueryError) {
      console.error('Error querying dev profile:', profileQueryError);
    } else {
      console.log('✅ Dev profile query successful:');
      console.log(profileQuery);
    }
    
    // Test 4: Verify we can query the persona by wallet address
    console.log('\n== Test 4: Query persona by wallet address ==');
    const { data: personaQuery, error: personaQueryError } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .eq('is_active', true)
      .maybeSingle();
    
    if (personaQueryError) {
      console.error('Error querying dev persona:', personaQueryError);
    } else {
      console.log('✅ Dev persona query successful:');
      console.log(personaQuery);
    }
    
    // Test 5: Update the persona
    console.log('\n== Test 5: Update persona ==');
    const { data: updatedPersona, error: updateError } = await supabase
      .from('dev_personas')
      .update({
        risk: 75,
        esg: 65,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', testWalletAddress)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating dev persona:', updateError);
    } else {
      console.log('✅ Dev persona updated successfully:');
      console.log(updatedPersona);
    }
    
  } catch (err) {
    console.error('Unexpected error in test flow:', err);
  }
}

runTests()
  .then(() => console.log('\n=== Test script completed ==='))
  .catch(err => console.error('Test script failed:', err));
