// seed-custom-dao.js
// A script to add any Snapshot space as a DAO to the database
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

// Map network ID to human-readable name
function getNetworkName(networkId) {
  const networks = {
    '1': 'Ethereum',
    '10': 'Optimism',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '8453': 'Base',
    '7777777': 'Zora',
    '324': 'zkSync Era',
    '100': 'Gnosis Chain',
    '56': 'BNB Chain',
    '43114': 'Avalanche',
    '1101': 'Polygon zkEVM',
    '42220': 'Celo',
  };
  
  return networks[networkId] || `Chain ID: ${networkId}`;
}

// Discover DAOs with active proposals using the edge function
async function discoverActiveDAOs() {
  try {
    console.log('Discovering Snapshot spaces with active proposals...');
    
    // Call the edge function to discover active DAOs
    const functionUrl = `${supabaseUrl}/functions/v1/add-custom-dao/discover`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error discovering active DAOs (${response.status}):`, errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
    
    const daos = result.daos || [];
    
    if (daos.length === 0) {
      console.log('No DAOs with active proposals found.');
      process.exit(0);
    }
    
    console.log('\n=== Spaces with Active Proposals ===');
    console.log('ID | Name | Network | Active Proposals');
    console.log('------------------------------------');
    
    // Sort by number of active proposals
    daos.sort((a, b) => b.activeProposals - a.activeProposals);
    
    daos.forEach(dao => {
      const network = dao.network ? getNetworkName(dao.network) : 'N/A';
      console.log(`${dao.id} | ${dao.name} | ${network} | ${dao.activeProposals}`);
    });
    
    console.log('\nTo add one of these spaces, run:');
    console.log('npm run seed:dao <space-id>');
    
  } catch (error) {
    console.error('Error discovering active DAOs:', error);
    process.exit(1);
  }
}

// Add a custom DAO using the edge function
async function addCustomDAO(spaceId) {
  if (!spaceId) {
    console.error('Please provide a Snapshot space ID');
    console.log('Usage: node seed-custom-dao.js <space-id>');
    console.log('Example: node seed-custom-dao.js aave.eth');
    console.log('To discover spaces with active proposals: node seed-custom-dao.js --discover');
    process.exit(1);
  }

  try {
    console.log(`Adding DAO from Snapshot space: ${spaceId}`);
    
    // Call the edge function to add the DAO
    const functionUrl = `${supabaseUrl}/functions/v1/add-custom-dao/add`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ spaceId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error adding DAO (${response.status}):`, errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
    
    console.log(`Success: ${result.message}`);
    
    if (result.dao) {
      console.log('\nDAO Information:');
      console.log(JSON.stringify(result.dao, null, 2));
    }
    
    // Sync proposals for this DAO
    console.log('\nWould you like to sync active proposals for this DAO? (y/n)');
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 'y' || input === 'yes') {
        console.log('Syncing active proposals...');
        await syncProposals(spaceId);
      } else {
        console.log('Skipping proposal sync');
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error('Error adding custom DAO:', error);
    process.exit(1);
  }
}

// Function to sync proposals using the edge function
async function syncProposals(daoId) {
  try {
    console.log(`Syncing active proposals for DAO ${daoId}`);
    
    // Call the edge function to sync proposals
    const functionUrl = `${supabaseUrl}/functions/v1/sync-dao-proposals`;
    
    console.log(`Calling edge function: ${functionUrl}`);
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ daoId, state: 'active' })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error syncing proposals (${response.status}):`, errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log(`Sync completed. Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`);
    
    process.exit(0);
  } catch (error) {
    console.error(`Error syncing proposals for DAO ${daoId}:`, error);
    process.exit(1);
  }
}

// Main entry point
const arg = process.argv[2];

if (arg === '--discover') {
  discoverActiveDAOs();
} else {
  addCustomDAO(arg);
} 