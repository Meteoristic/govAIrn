// Test script for persona flow with wallet-based authentication
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';  // Import randomUUID from crypto module

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

// Using service role key for testing, as we need admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test wallet address (example, can be replaced with your test wallet)
const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'.toLowerCase();

async function runTests() {
  console.log('=== Testing Persona Flow with Wallet-based Authentication ===');
  
  // Test 1: Verify database connection
  console.log('\n\n== Test 1: Verifying Database Connection ==');
  try {
    const { data, error } = await supabase.from('dev_personas').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database connection error:', error);
    } else {
      console.log('✅ Database connection successful!');
    }
  } catch (err) {
    console.error('Unexpected error testing connection:', err);
  }
  
  // Test 2: Create a persona with wallet address
  console.log('\n\n== Test 2: Creating a Persona with Wallet Address ==');
  try {
    // First check if a persona already exists for this wallet
    const { data: existingPersonas } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('wallet_address', testWalletAddress);
    
    console.log(`Found ${existingPersonas?.length || 0} existing personas for wallet`);
    
    // Create random UUID for user_id as would happen in production
    const randomUserId = randomUUID(); // Use the imported randomUUID function
    
    const personaData = {
      user_id: randomUserId, // In production this would be auth.user.id
      wallet_address: testWalletAddress,
      name: 'Test Persona',
      risk: 75,
      esg: 50,
      treasury: 25,
      horizon: 60,
      frequency: 40,
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    console.log('Inserting persona with data:', JSON.stringify(personaData, null, 2));
    
    const { data: newPersona, error } = await supabase
      .from('dev_personas')
      .insert([personaData])
      .select();
    
    if (error) {
      console.error('Error creating persona:', error);
    } else {
      console.log('✅ Persona created successfully!');
      console.log('Persona details:', JSON.stringify(newPersona, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error creating persona:', err);
  }
  
  // Test 3: Query personas by wallet address
  console.log('\n\n== Test 3: Querying Personas by Wallet Address ==');
  try {
    const { data: personas, error } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('wallet_address', testWalletAddress);
    
    if (error) {
      console.error('Error querying personas:', error);
    } else {
      console.log(`✅ Found ${personas.length} personas for wallet ${testWalletAddress}`);
      console.log('Persona details:', JSON.stringify(personas, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error querying personas:', err);
  }
  
  // Test the full flow: Get or create persona, then update it
  console.log('\n\n== Test 4: Full Flow - Getting/Creating and then Updating a Persona ==');
  try {
    console.log('Step 1: Getting or creating a persona for wallet', testWalletAddress);
    
    // First check if an active persona exists for this wallet
    const { data: activePerson, error: activePersonaError } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .eq('is_active', true)
      .maybeSingle();
      
    if (activePersonaError) {
      console.error('Error checking for active persona:', activePersonaError);
      throw activePersonaError;
    }
    
    let personaId;
    if (activePerson) {
      console.log('Found existing active persona:', activePerson.id);
      personaId = activePerson.id;
    } else {
      // Check for any persona for this wallet
      const { data: anyPersonas, error: anyPersonaError } = await supabase
        .from('dev_personas')
        .select('*')
        .eq('wallet_address', testWalletAddress)
        .limit(1);
        
      if (anyPersonaError) {
        console.error('Error checking for any persona:', anyPersonaError);
        throw anyPersonaError;
      }
      
      if (anyPersonas && anyPersonas.length > 0) {
        console.log('Found existing non-active persona:', anyPersonas[0].id);
        personaId = anyPersonas[0].id;
      } else {
        // Need to create a new persona
        console.log('No persona found, creating new one');
        
        const randomUserId = randomUUID();
        const timestamp = new Date().toISOString();
        
        const personaData = {
          user_id: randomUserId,
          wallet_address: testWalletAddress,
          name: 'Test Persona',
          risk: 50,
          esg: 50,
          treasury: 50,
          horizon: 50,
          frequency: 50,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp
        };
        
        const { data: newPersona, error: createError } = await supabase
          .from('dev_personas')
          .insert([personaData])
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating persona:', createError);
          throw createError;
        }
        
        console.log('✅ Created new persona:', newPersona.id);
        personaId = newPersona.id;
      }
    }
    
    // Now update the persona with new values
    console.log('Step 2: Updating persona with ID:', personaId);
    
    const timestamp = new Date().toISOString();
    
    // These are the values that would come from the UI sliders
    const updatedValues = {
      name: 'Updated Test Persona',
      risk: 75,         // Changed from default 50
      esg: 65,          // Changed from default 50
      treasury: 40,     // Changed from default 50
      horizon: 80,      // Changed from default 50
      frequency: 35,    // Changed from default 50
      is_active: true,
      updated_at: timestamp
    };
    
    const { data: updatedPersona, error: updateError } = await supabase
      .from('dev_personas')
      .update(updatedValues)
      .eq('id', personaId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating persona:', updateError);
      throw updateError;
    }
    
    console.log('✅ Successfully updated persona! New values:');
    console.log(JSON.stringify(updatedPersona, null, 2));
    
    // Verify the persona was actually updated by fetching it again
    const { data: verifiedPersona, error: verifyError } = await supabase
      .from('dev_personas')
      .select('*')
      .eq('id', personaId)
      .single();
      
    if (verifyError) {
      console.error('Error verifying persona update:', verifyError);
    } else {
      console.log('✅ Verified persona update:');
      console.log(JSON.stringify({
        id: verifiedPersona.id,
        name: verifiedPersona.name,
        risk: verifiedPersona.risk,
        esg: verifiedPersona.esg,
        treasury: verifiedPersona.treasury,
        horizon: verifiedPersona.horizon,
        frequency: verifiedPersona.frequency
      }, null, 2));
    }
    
  } catch (err) {
    console.error('Error in full persona flow test:', err);
  }
}

// Run the tests
runTests()
  .then(() => console.log('\n\n=== Test script completed ==='))
  .catch(err => console.error('Test script failed:', err));
