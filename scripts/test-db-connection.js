// Simple script to test direct database connection and insertion
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testDbConnection() {
  console.log('===== SUPABASE CONNECTION TEST =====');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing environment variables');
    console.log('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
    console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    process.exit(1);
  }
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service key available:', !!supabaseServiceKey);
  console.log('Service key first 10 chars:', supabaseServiceKey.substring(0, 10) + '...');
  
  // Test wallet address
  const walletAddress = '0xfb2aD6d3bb01d80FF8870246910606C7c39CDb6E'.toLowerCase();
  console.log('Test wallet address:', walletAddress);
  
  // Generate a UUID for testing
  const uuid = generateUUID();
  console.log('Using UUID:', uuid);

  try {
    console.log('\n===== 1. TESTING DIRECT API CALLS =====');
    // Try direct Supabase REST API calls first
    try {
      console.log('Checking auth.users table...');
      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?select=*&limit=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        }
      );
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      } else {
        const data = await response.json();
        console.log('Success! Users table access:', data.length > 0 ? 'Has data' : 'Empty table');
      }
    } catch (e) {
      console.error('Error accessing users table:', e);
    }
    
    // Try creating a user directly via the REST API
    try {
      console.log('\nTrying to create a user via direct API...');
      const email = `test_${Date.now()}@example.com`;
      const password = 'Test123!@#';
      
      const signUpResponse = await fetch(
        `${supabaseUrl}/auth/v1/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            email,
            password,
            data: {
              wallet_address: walletAddress
            }
          })
        }
      );
      
      if (!signUpResponse.ok) {
        console.error(`API error: ${signUpResponse.status} ${signUpResponse.statusText}`);
        const errorText = await signUpResponse.text();
        console.error('Error response:', errorText);
      } else {
        const data = await signUpResponse.json();
        console.log('User created:', data.user?.id);
        
        // Now try to create a profile for this user
        if (data.user?.id) {
          console.log('Creating profile for user:', data.user.id);
          const profileResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                id: data.user.id,
                wallet_address: walletAddress,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_sign_in: new Date().toISOString()
              })
            }
          );
          
          if (!profileResponse.ok) {
            console.error(`Profile creation error: ${profileResponse.status} ${profileResponse.statusText}`);
            const errorText = await profileResponse.text();
            console.error('Error response:', errorText);
          } else {
            const profileData = await profileResponse.json();
            console.log('Profile created successfully:', profileData);
          }
        }
      }
    } catch (e) {
      console.error('Error creating user via direct API:', e);
    }
    
    console.log('\n===== 2. TESTING SUPABASE CLIENT =====');
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to create a user with Supabase client
    try {
      console.log('Creating auth user with Supabase client...');
      const email = `test_client_${Date.now()}@example.com`;
      const password = 'Test123!@#';
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          wallet_address: walletAddress
        }
      });
      
      if (authError) {
        console.error('Error creating user with admin.createUser:', authError);
      } else {
        console.log('User created with Supabase client:', authData.user.id);
        
        // Now try to create a profile for this user
        if (authData.user?.id) {
          console.log('Creating profile for user:', authData.user.id);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              wallet_address: walletAddress,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_sign_in: new Date().toISOString()
            }])
            .select();
          
          if (profileError) {
            console.error('Error creating profile with Supabase client:', profileError);
          } else {
            console.log('Profile created successfully with Supabase client:', profileData);
          }
        }
      }
    } catch (e) {
      console.error('Error in Supabase client test:', e);
    }
    
  } catch (error) {
    console.error('Critical error:', error);
  }
  
  console.log('\n===== TEST COMPLETE =====');
}

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the test
testDbConnection()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
