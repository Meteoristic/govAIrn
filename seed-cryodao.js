// seed-cryodao.js
// A script to add CryoDAO to the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch basic info about the CryoDAO Snapshot space
async function fetchSnapshotSpaceData(spaceId) {
  try {
    const query = `
      query {
        space(id: "${spaceId}") {
          id
          name
          about
          network
          avatar
          website
        }
      }
    `;

    const response = await fetch('https://hub.snapshot.org/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }
    
    return data.data.space;
  } catch (error) {
    console.error(`Error fetching space details for ${spaceId}:`, error);
    return null;
  }
}

async function seedCryoDAO() {
  const spaceId = 'cryodao.eth';
  
  console.log(`Fetching data for Snapshot space: ${spaceId}`);
  let spaceData = await fetchSnapshotSpaceData(spaceId);
  
  if (!spaceData) {
    console.warn(`Failed to fetch data for Snapshot space: ${spaceId}, using hardcoded values`);
    // Use hardcoded values as fallback
    spaceData = {
      id: spaceId,
      name: 'CryoDAO',
      about: 'Web3 community focused on NFT curation and governance',
      network: '1', // Ethereum
      avatar: 'https://i.imgur.com/G6oaEOf.png',
      website: 'https://cryodao.org'
    };
  }
  
  console.log(`Using space: ${spaceData.name}`);
  
  // Determine platform based on network
  let platform = 'Snapshot';
  if (spaceData.network) {
    if (spaceData.network === '1') platform = 'Ethereum';
    else if (spaceData.network === '8453') platform = 'Base';
    else if (spaceData.network === '10') platform = 'Optimism';
    else if (spaceData.network === '42161') platform = 'Arbitrum';
    else if (spaceData.network === '137') platform = 'Polygon';
    else platform = `Chain ID: ${spaceData.network}`;
  }

  const cryoDAO = {
    id: spaceId,
    name: spaceData.name || 'CryoDAO',
    description: spaceData.about || 'Web3 community focused on NFT curation and governance',
    platform: platform,
    logo_url: spaceData.avatar || 'https://i.imgur.com/G6oaEOf.png',
    governance_url: `https://snapshot.org/#/${spaceId}`,
    is_base_ecosystem: platform === 'Base', // Mark as Base ecosystem if it's on Base
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('DAO information:');
  console.log(JSON.stringify(cryoDAO, null, 2));
  console.log('Adding CryoDAO to database...');

  // Check if DAO already exists
  const { data: existingDAO, error: checkError } = await supabase
    .from('daos')
    .select('*')
    .eq('id', cryoDAO.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking for existing DAO:', checkError);
    return;
  }

  if (existingDAO) {
    console.log(`Updating existing CryoDAO: ${existingDAO.id}`);
    const { error: updateError } = await supabase
      .from('daos')
      .update(cryoDAO)
      .eq('id', cryoDAO.id);

    if (updateError) {
      console.error('Error updating DAO:', updateError);
      return;
    }
    console.log('Successfully updated CryoDAO');
  } else {
    console.log('Creating new CryoDAO entry');
    const { error: insertError } = await supabase
      .from('daos')
      .insert([cryoDAO]);

    if (insertError) {
      console.error('Error inserting DAO:', insertError);
      return;
    }
    console.log('Successfully added CryoDAO to database');
  }
  
  // Ask user if they want to sync proposals
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

// Run the seed function
seedCryoDAO()
  .then(() => {
    // Don't exit here as we're waiting for user input on proposal sync
  })
  .catch(err => {
    console.error('An error occurred:', err);
    process.exit(1);
  }); 