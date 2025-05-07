/**
 * Snapshot API Test Script
 * 
 * This script tests connectivity to the Snapshot API and verifies if we can fetch real proposals
 * for Base ecosystem DAOs. Run it with "node scripts/test-snapshot-api.js" from the project root.
 */

import axios from 'axios';

const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
const BASE_ECOSYSTEM_DAOS = [
  'uniswap.eth',
  'aavedao.eth',
  'aerodrome.eth',
  'basedaoglobal.eth'
];

async function testSnapshotAPI() {
  console.log('===== Snapshot API Test Script =====');
  console.log('\nTesting connection to Snapshot API...');

  // Test 1: Basic API connection
  try {
    const response = await axios.post(SNAPSHOT_API_URL, { 
      query: `query { spaces(first: 1) { id, name } }` 
    });
    
    if (response.data && response.data.data && response.data.data.spaces) {
      console.log('✅ Successfully connected to Snapshot API');
    } else {
      console.log('❌ Received unexpected response format from Snapshot API');
      console.log(response.data);
      return;
    }
  } catch (error) {
    console.log('❌ Failed to connect to Snapshot API');
    console.log(error.message);
    return;
  }

  // Test 2: Check Base ecosystem DAO spaces existence
  console.log('\nChecking Base ecosystem DAO spaces...');
  for (const daoId of BASE_ECOSYSTEM_DAOS) {
    try {
      const response = await axios.post(SNAPSHOT_API_URL, { 
        query: `query { space(id: "${daoId}") { id, name, about, network, symbol, avatar } }` 
      });
      
      if (response.data && response.data.data && response.data.data.space) {
        console.log(`✅ Space "${daoId}" exists: ${response.data.data.space.name}`);
      } else {
        console.log(`❌ Space "${daoId}" not found`);
      }
    } catch (error) {
      console.log(`❌ Error checking space "${daoId}": ${error.message}`);
    }
  }

  // Test 3: Check for active proposals in each DAO
  console.log('\nChecking for active proposals in each DAO...');
  for (const daoId of BASE_ECOSYSTEM_DAOS) {
    try {
      const response = await axios.post(SNAPSHOT_API_URL, { 
        query: `
          query {
            proposals(
              first: 10,
              skip: 0,
              where: {
                space: "${daoId}",
                state: "active"
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
        `
      });
      
      if (response.data && response.data.data && response.data.data.proposals) {
        const proposals = response.data.data.proposals;
        console.log(`✅ Found ${proposals.length} active proposals for "${daoId}"`);
        
        if (proposals.length > 0) {
          console.log(`   Example: "${proposals[0].title}" (starts: ${new Date(proposals[0].start * 1000).toLocaleString()}, ends: ${new Date(proposals[0].end * 1000).toLocaleString()})`);
        }
      } else {
        console.log(`❌ Error fetching proposals for "${daoId}"`);
      }
    } catch (error) {
      console.log(`❌ Error fetching proposals for "${daoId}": ${error.message}`);
    }
  }

  // Test 4: Check for closed proposals as a fallback
  console.log('\nChecking for closed proposals as fallback...');
  for (const daoId of BASE_ECOSYSTEM_DAOS) {
    try {
      const response = await axios.post(SNAPSHOT_API_URL, { 
        query: `
          query {
            proposals(
              first: 5,
              skip: 0,
              where: {
                space: "${daoId}",
                state: "closed"
              },
              orderBy: "created",
              orderDirection: desc
            ) {
              id
              title
              state
            }
          }
        `
      });
      
      if (response.data && response.data.data && response.data.data.proposals) {
        const proposals = response.data.data.proposals;
        console.log(`✅ Found ${proposals.length} closed proposals for "${daoId}"`);
      } else {
        console.log(`❌ Error fetching closed proposals for "${daoId}"`);
      }
    } catch (error) {
      console.log(`❌ Error fetching closed proposals for "${daoId}": ${error.message}`);
    }
  }

  console.log('\n===== API TEST COMPLETE =====');
}

testSnapshotAPI().catch(error => {
  console.log('Unhandled error during test:', error.message);
});
