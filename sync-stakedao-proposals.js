// sync-stakedao-proposals.js
// A script to sync proposals for StakeDAO after it's been added to the database
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

// Function to sync proposals using the edge function
async function syncProposals(daoId, state = 'active') {
  try {
    console.log(`Syncing ${state} proposals for DAO ${daoId}...`);
    
    // Call the edge function to sync proposals
    const functionUrl = `${supabaseUrl}/functions/v1/sync-dao-proposals`;
    
    console.log(`Calling edge function: ${functionUrl}`);
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ daoId, state })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error syncing proposals (${response.status}):`, errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log(`Sync completed. Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`);
    
    return result;
  } catch (error) {
    console.error(`Error syncing proposals for DAO ${daoId}:`, error);
    process.exit(1);
  }
}

async function main() {
  const daoId = 'stakedao.eth';
  
  // First sync active proposals
  const activeResult = await syncProposals(daoId, 'active');
  console.log(`Synced ${activeResult.added + activeResult.updated} active proposals for StakeDAO`);
  
  // Ask if user wants to sync closed proposals too (can be many)
  if (activeResult.added + activeResult.updated === 0) {
    console.log('\nNo active proposals found. Would you like to sync closed proposals? (y/n)');
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 'y' || input === 'yes') {
        console.log('Syncing closed proposals...');
        const closedResult = await syncProposals(daoId, 'closed');
        console.log(`Synced ${closedResult.added + closedResult.updated} closed proposals for StakeDAO`);
        process.exit(0);
      } else {
        console.log('Skipping closed proposals');
        process.exit(0);
      }
    });
  } else {
    console.log('Successfully synced active proposals for StakeDAO');
    process.exit(0);
  }
}

// Run the sync function
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
}); 