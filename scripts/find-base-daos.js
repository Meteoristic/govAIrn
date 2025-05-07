/**
 * Find Base Ecosystem DAOs Script
 * 
 * This script searches for Base ecosystem DAOs on Snapshot and tests proposal data retrieval.
 * It helps identify the correct Snapshot space IDs to use in our application.
 */

import axios from 'axios';

const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';

// Potential alternative Snapshot space IDs for Base ecosystem DAOs
const BASE_DAO_CANDIDATES = {
  // Uniswap alternatives
  'uniswap': ['uniswap', 'uni', 'uniswapgov.eth', 'uniswapgovernance.eth'],
  
  // Aave alternatives (already working as 'aavedao.eth')
  'aave': ['aavedao.eth', 'aave.eth'],
  
  // Aerodrome alternatives
  'aerodrome': ['aerodrome', 'aerodrome.eth', 'aero', 'aero.eth', 'aerodromefinance.eth'],
  
  // Base DAO alternatives
  'base': ['basegov.eth', 'basedao.eth', 'basedaoglobal.eth', 'base', 'baseglobal.eth']
};

// Map to track found DAOs
const FOUND_DAOS = [];

async function searchForDAO(searchTerm) {
  console.log(`\nSearching for "${searchTerm}" related spaces...`);
  
  try {
    const response = await axios.post(SNAPSHOT_API_URL, { 
      query: `
        query {
          spaces(
            first: 10,
            skip: 0,
            where: {
              name_contains_nocase: "${searchTerm}"
            }
          ) {
            id
            name
            about
            network
            symbol
            avatar
            followersCount
          }
        }
      `
    });
    
    const spaces = response.data?.data?.spaces || [];
    if (spaces.length > 0) {
      console.log(`✅ Found ${spaces.length} spaces matching "${searchTerm}"`);
      
      // Sort by followers count to find most popular/official spaces
      spaces.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
      
      spaces.forEach(space => {
        console.log(`   - ${space.name} (ID: ${space.id}, Network: ${space.network || 'unknown'}, Followers: ${space.followersCount || 0})`);
        // Check if this DAO operates on Base (network 8453)
        if (space.network === '8453' || space.about?.toLowerCase().includes('base')) {
          console.log(`     ⭐ Potential Base ecosystem DAO`);
        }
      });
      
      // Add the top result to our found DAOs
      if (spaces[0]) {
        FOUND_DAOS.push({
          id: spaces[0].id,
          name: spaces[0].name,
          followers: spaces[0].followersCount || 0,
          network: spaces[0].network || 'unknown'
        });
      }
      
      return spaces;
    } else {
      console.log(`❌ No spaces found for "${searchTerm}"`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error searching for "${searchTerm}": ${error.message}`);
    return [];
  }
}

async function checkProposalsForSpace(spaceId) {
  console.log(`\nChecking proposals for space "${spaceId}"...`);
  
  try {
    // Check active proposals
    const activeResponse = await axios.post(SNAPSHOT_API_URL, { 
      query: `
        query {
          proposals(
            first: 5,
            skip: 0,
            where: {
              space: "${spaceId}",
              state: "active"
            },
            orderBy: "created",
            orderDirection: desc
          ) {
            id
            title
            state
            start
            end
          }
        }
      `
    });
    
    const activeProposals = activeResponse.data?.data?.proposals || [];
    console.log(`✅ Found ${activeProposals.length} active proposals for "${spaceId}"`);
    activeProposals.forEach(p => {
      console.log(`   - "${p.title}" (${new Date(p.start * 1000).toLocaleDateString()} to ${new Date(p.end * 1000).toLocaleDateString()})`);
    });
    
    // Check closed proposals if no active ones
    if (activeProposals.length === 0) {
      const closedResponse = await axios.post(SNAPSHOT_API_URL, { 
        query: `
          query {
            proposals(
              first: 5,
              skip: 0,
              where: {
                space: "${spaceId}",
                state: "closed"
              },
              orderBy: "created",
              orderDirection: desc
            ) {
              id
              title
              state
              start
              end
            }
          }
        `
      });
      
      const closedProposals = closedResponse.data?.data?.proposals || [];
      console.log(`✅ Found ${closedProposals.length} closed proposals for "${spaceId}"`);
      closedProposals.forEach(p => {
        console.log(`   - "${p.title}" (${new Date(p.start * 1000).toLocaleDateString()} to ${new Date(p.end * 1000).toLocaleDateString()})`);
      });
      
      return { active: activeProposals.length, closed: closedProposals.length };
    }
    
    return { active: activeProposals.length, closed: 0 };
  } catch (error) {
    console.log(`❌ Error checking proposals for "${spaceId}": ${error.message}`);
    return { active: 0, closed: 0 };
  }
}

async function findBaseEcosystemDAOs() {
  console.log('===== Base Ecosystem DAO Finder =====');
  
  // Search for each DAO candidate
  for (const [dao, candidates] of Object.entries(BASE_DAO_CANDIDATES)) {
    console.log(`\n----- Searching for ${dao.toUpperCase()} DAO -----`);
    
    // First try direct candidates
    let found = false;
    for (const candidate of candidates) {
      try {
        const response = await axios.post(SNAPSHOT_API_URL, { 
          query: `query { space(id: "${candidate}") { id, name, about, network, followersCount } }` 
        });
        
        if (response.data?.data?.space) {
          const space = response.data.data.space;
          console.log(`✅ Direct match found: "${candidate}" = ${space.name} (Followers: ${space.followersCount || 0})`);
          
          // Check if has proposals
          const proposalStats = await checkProposalsForSpace(candidate);
          
          FOUND_DAOS.push({
            id: candidate,
            name: space.name,
            followers: space.followersCount || 0,
            proposals: proposalStats.active + proposalStats.closed,
            network: space.network || 'unknown'
          });
          
          found = true;
          break;
        }
      } catch (error) {
        // Ignore errors and continue with search
      }
    }
    
    // If no direct candidates found, search by name
    if (!found) {
      await searchForDAO(dao);
    }
  }
  
  // Generate final recommendations
  console.log('\n\n===== BASE ECOSYSTEM DAO RECOMMENDATIONS =====');
  console.log('Based on our search, these are the recommended Snapshot spaces to use:');
  
  // Sort DAOs by proposal count and followers
  FOUND_DAOS.sort((a, b) => {
    if ((b.proposals || 0) === (a.proposals || 0)) {
      return (b.followers || 0) - (a.followers || 0);
    }
    return (b.proposals || 0) - (a.proposals || 0);
  });
  
  console.log('\nRecommended configuration for DaoService.BASE_ECOSYSTEM_DAOS:');
  console.log('```typescript');
  console.log('static readonly BASE_ECOSYSTEM_DAOS = [');
  FOUND_DAOS.forEach(dao => {
    console.log(`  {`);
    console.log(`    id: '${dao.id}',`);
    console.log(`    name: '${dao.name}',`);
    console.log(`    platform: 'Snapshot',`);
    console.log(`    description: '${dao.name} DAO with ${dao.proposals || 0} proposals (${dao.followers || 0} followers)',`);
    console.log(`    isBaseSpecific: true`);
    console.log(`  },`);
  });
  console.log('];');
  console.log('```');
  
  console.log('\n===== SEARCH COMPLETE =====');
}

findBaseEcosystemDAOs().catch(error => {
  console.log('Unhandled error during search:', error.message);
});
