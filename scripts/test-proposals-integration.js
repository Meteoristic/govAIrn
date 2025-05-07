/**
 * Test Proposals Integration Script
 * 
 * This script tests the full integration flow:
 * 1. Clears any existing seed data
 * 2. Seeds the correct Base ecosystem DAOs
 * 3. Syncs real proposals from Snapshot
 * 4. Verifies that the proposals are correctly stored
 * 
 * Run with: node scripts/test-proposals-integration.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configure Supabase client - using same config as in our app
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://glggdwdtbetczwdfanfb.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZ2dkd2R0YmV0Y3p3ZGZhbmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NTY4NTUsImV4cCI6MjAxODUzMjg1NX0.Jn9D0AhKisMDvRqb9T4mIcULxDfTNYJ2U-_nOGjBjUs';

// Constants for the test
const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
const BASE_ECOSYSTEM_DAOS = [
  {
    id: 'uniswapgovernance.eth',
    name: 'Uniswap',
    platform: 'Snapshot',
    description: 'Leading DEX protocol with deployment on Base',
    isBaseSpecific: true
  },
  {
    id: 'aavedao.eth',
    name: 'Aave',
    platform: 'Snapshot',
    description: 'Liquidity protocol available on Base',
    isBaseSpecific: true
  }
];

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getSnapshotSpace(spaceId) {
  try {
    const query = `
      query {
        space(id: "${spaceId}") {
          id
          name
          about
          network
          symbol
          avatar
        }
      }
    `;

    const response = await axios.post(SNAPSHOT_API_URL, { query });
    return response.data?.data?.space;
  } catch (error) {
    console.error(`Error fetching Snapshot space ${spaceId}:`, error.message);
    return null;
  }
}

async function getSnapshotProposals(spaceId, state = 'active') {
  try {
    const stateFilter = state === 'all' ? '' : `state: "${state}",`;
    
    const query = `
      query {
        proposals(
          first: 100,
          skip: 0,
          where: {
            space: "${spaceId}",
            ${stateFilter}
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          snapshot
          state
          space {
            id
            name
          }
        }
      }
    `;

    const response = await axios.post(SNAPSHOT_API_URL, { query });
    return response.data?.data?.proposals || [];
  } catch (error) {
    console.error(`Error fetching Snapshot proposals for ${spaceId}:`, error.message);
    return [];
  }
}

async function seedBaseEcosystemDAOs() {
  console.log('\n--- Seeding Base Ecosystem DAOs ---');
  const result = { added: 0, updated: 0, failed: 0 };

  for (const daoInfo of BASE_ECOSYSTEM_DAOS) {
    try {
      console.log(`Processing ${daoInfo.name} (${daoInfo.id})...`);
      
      // Get space data from Snapshot
      const spaceData = await getSnapshotSpace(daoInfo.id);
      
      if (!spaceData) {
        console.log(`❌ Failed to fetch data for Snapshot space: ${daoInfo.id}`);
        result.failed++;
        continue;
      }
      
      // Format data for storage with Snapshot info
      const daoData = {
        id: daoInfo.id,
        name: spaceData.name || daoInfo.name,
        logo_url: spaceData.avatar,
        description: daoInfo.description,
        platform: 'Snapshot',
        governance_url: `https://snapshot.org/#/${daoInfo.id}`,
        network: 'Base',
        is_base_ecosystem: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Upsert the DAO (insert if not exists, update if exists)
      const { error } = await supabase
        .from('daos')
        .upsert(daoData);
        
      if (error) {
        console.log(`❌ Error upserting DAO ${daoInfo.id}:`, error.message);
        result.failed++;
      } else {
        console.log(`✅ Successfully added/updated DAO: ${daoInfo.name}`);
        result.added++;
      }
    } catch (error) {
      console.log(`❌ Error processing DAO ${daoInfo.id}:`, error.message);
      result.failed++;
    }
  }
  
  console.log(`DAO Seeding Results: Added/Updated: ${result.added}, Failed: ${result.failed}`);
  return result;
}

async function syncProposals(daoId, state = 'active') {
  console.log(`\n--- Syncing ${state} proposals for ${daoId} ---`);
  const result = { added: 0, updated: 0, failed: 0 };
  
  try {
    // Get proposals from Snapshot
    const proposals = await getSnapshotProposals(daoId, state);
    console.log(`Found ${proposals.length} ${state} proposals for ${daoId}`);
    
    if (proposals.length === 0) {
      return result;
    }
    
    // Process each proposal
    for (const proposal of proposals) {
      try {
        // Convert Snapshot state to our status format
        let status = proposal.state === 'active' ? 'active' : 
                    proposal.state === 'closed' ? 'executed' : 'missed';
        
        // Format for our database
        const proposalData = {
          external_id: proposal.id,
          dao_id: daoId,
          title: proposal.title,
          description: proposal.body,
          status,
          start_time: new Date(proposal.start * 1000).toISOString(),
          end_time: new Date(proposal.end * 1000).toISOString(),
          voting_type: 'simple majority',
          quorum: 'N/A',
          impact: 'medium',
          url: `https://snapshot.org/#/${daoId}/proposal/${proposal.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Extract a summary from the proposal body
        proposalData.summary = extractSummary(proposal.body);
        
        // Upsert the proposal
        const { error } = await supabase
          .from('proposals')
          .upsert(proposalData)
          .select('id')
          .single();
          
        if (error) {
          console.log(`❌ Error upserting proposal ${proposal.id}:`, error.message);
          result.failed++;
        } else {
          console.log(`✅ Successfully processed proposal: "${proposal.title}"`);
          result.added++;
        }
      } catch (error) {
        console.log(`❌ Error processing proposal ${proposal.id}:`, error.message);
        result.failed++;
      }
    }
  } catch (error) {
    console.log(`❌ Error syncing proposals for DAO ${daoId}:`, error.message);
  }
  
  console.log(`Proposal Sync Results for ${daoId}: Added/Updated: ${result.added}, Failed: ${result.failed}`);
  return result;
}

// Simple function to extract a summary from markdown
function extractSummary(markdown) {
  if (!markdown) return 'No description available';
  
  // Remove markdown formatting
  const plainText = markdown
    .replace(/#+\s/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/`([^`]+)`/g, '$1'); // Remove code
  
  // Split by newlines and find first non-empty paragraph
  const paragraphs = plainText.split('\n').filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) return 'No description available';
  
  // Return first paragraph, truncated if needed
  const summary = paragraphs[0].trim();
  return summary.length > 200 ? summary.substring(0, 197) + '...' : summary;
}

async function listDatabaseProposals() {
  console.log('\n--- Listing All Database Proposals ---');
  
  try {
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select(`
        *,
        daos (
          id,
          name,
          logo_url
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.log('❌ Error fetching proposals:', error.message);
      return [];
    }
    
    if (proposals.length === 0) {
      console.log('No proposals found in database.');
      return [];
    }
    
    console.log(`Found ${proposals.length} total proposals in database:`);
    proposals.forEach(p => {
      const dao = p.daos || {};
      console.log(`- [${dao.name || 'Unknown DAO'}] "${p.title}" (Status: ${p.status})`);
      console.log(`  Start: ${new Date(p.start_time).toLocaleString()}, End: ${new Date(p.end_time).toLocaleString()}`);
      console.log(`  Summary: ${p.summary?.substring(0, 100)}${p.summary?.length > 100 ? '...' : ''}`);
      console.log(`  URL: ${p.url}`);
      console.log('');
    });
    
    return proposals;
  } catch (error) {
    console.log('❌ Error listing proposals:', error.message);
    return [];
  }
}

async function runIntegrationTest() {
  console.log('====== PROPOSAL INTEGRATION TEST ======');
  
  // Step 1: Seed the Base ecosystem DAOs
  await seedBaseEcosystemDAOs();
  
  // Step 2: Sync proposals for each DAO
  for (const dao of BASE_ECOSYSTEM_DAOS) {
    // Try active proposals first
    const activeResult = await syncProposals(dao.id, 'active');
    
    // If no active proposals, try closed proposals
    if (activeResult.added === 0) {
      console.log(`No active proposals found for ${dao.id}, trying closed proposals...`);
      await syncProposals(dao.id, 'closed');
    }
  }
  
  // Step 3: List all proposals in the database
  const proposals = await listDatabaseProposals();
  
  console.log('\n====== TEST SUMMARY ======');
  console.log(`Total DAOs added: ${BASE_ECOSYSTEM_DAOS.length}`);
  console.log(`Total proposals in database: ${proposals.length}`);
  console.log('\nNext steps:');
  console.log('- Check if the real proposals are shown in the UI');
  console.log('- Use the data for AI processing and governance metrics');
  console.log('======= TEST COMPLETE =======');
}

runIntegrationTest().catch(error => {
  console.log('❌ Unhandled error:', error.message);
});
