// check-functions.js
// A simple script to check if the required Supabase edge functions are accessible
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Supabase details
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// List of required edge functions and their endpoints to test
const requiredFunctions = [
  {
    name: 'sync-dao-proposals',
    endpoint: `${supabaseUrl}/functions/v1/sync-dao-proposals`,
    method: 'OPTIONS', // Use OPTIONS to avoid any side effects
    description: 'Synchronizes proposals from Snapshot to the database'
  },
  {
    name: 'add-custom-dao',
    endpoint: `${supabaseUrl}/functions/v1/add-custom-dao/add`,
    method: 'OPTIONS',
    description: 'Adds custom DAOs to the database (bypassing RLS)'
  }
];

// Check if a function is accessible
async function checkFunction(func) {
  try {
    console.log(`Checking ${func.name}...`);
    
    const response = await fetch(func.endpoint, {
      method: func.method,
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    // Any response (even 4xx) means the function exists
    // 404 specifically means the function doesn't exist
    if (response.status === 404) {
      return {
        name: func.name,
        deployed: false,
        status: response.status,
        message: 'Function not found'
      };
    }
    
    return {
      name: func.name,
      deployed: true,
      status: response.status,
      message: 'Function is accessible'
    };
  } catch (error) {
    return {
      name: func.name,
      deployed: false,
      status: null,
      message: `Error checking function: ${error.message}`
    };
  }
}

async function checkAllFunctions() {
  console.log('Checking required Supabase edge functions...\n');
  
  const results = [];
  let allDeployed = true;
  
  for (const func of requiredFunctions) {
    const result = await checkFunction(func);
    results.push(result);
    
    if (!result.deployed) {
      allDeployed = false;
    }
  }
  
  // Display results
  console.log('\nResults:');
  console.log('-------------------------------------');
  
  results.forEach(result => {
    const status = result.deployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED';
    console.log(`${result.name}: ${status}`);
    console.log(`  ${requiredFunctions.find(f => f.name === result.name).description}`);
    console.log(`  ${result.message}`);
    console.log('');
  });
  
  // Instructions for missing functions
  if (!allDeployed) {
    console.log('\nSome required functions are not deployed. To deploy them:');
    console.log('1. Make sure you have the Supabase CLI installed:');
    console.log('   npm install -g supabase');
    console.log('2. Login to your Supabase account:');
    console.log('   supabase login');
    console.log('3. Deploy the missing functions:');
    
    results.forEach(result => {
      if (!result.deployed) {
        console.log(`   npx supabase functions deploy ${result.name} --project-ref <your-project-ref>`);
      }
    });
    
    console.log('\nNote: You can find your project reference in the URL of your Supabase dashboard:');
    console.log('https://app.supabase.com/project/<your-project-ref>');
  } else {
    console.log('✅ All required functions are deployed and accessible.');
  }
}

// Run the check
checkAllFunctions()
  .catch(error => {
    console.error('Error checking functions:', error);
    process.exit(1);
  }); 