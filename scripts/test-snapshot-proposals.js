import axios from 'axios';

// Test DAOs
const TEST_DAOS = [
  'ens.eth',
  'gitcoindao.eth',
  'aavedao.eth'
];

// Snapshot API URL
const API_URL = 'https://hub.snapshot.org/graphql';

// Function to fetch proposals for a space
async function getProposals(spaceId, state = 'all') {
  try {
    console.log(`\nFetching proposals for ${spaceId} with state: ${state}`);
    
    let stateFilter = '';
    if (state && state !== 'all') {
      stateFilter = `state: "${state}",`;
    }
    
    const query = `
      query {
        proposals(
          first: 50,
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
          state
          start
          end
        }
      }
    `;
    
    const response = await axios.post(API_URL, { query });
    
    if (response.data?.data?.proposals) {
      const proposals = response.data.data.proposals;
      console.log(`Found ${proposals.length} ${state} proposals for ${spaceId}`);
      if (proposals.length > 0) {
        console.log(`First proposal: ${proposals[0].title} (${proposals[0].state})`);
      }
      return proposals;
    }
    
    console.log(`No proposals found for ${spaceId}`);
    return [];
  } catch (error) {
    console.error(`Error fetching proposals for space ${spaceId}:`, error.message);
    return [];
  }
}

// Function to fetch space info
async function getSpace(spaceId) {
  try {
    console.log(`\nFetching space info for ${spaceId}`);
    
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
    
    const response = await axios.post(API_URL, { query });
    
    if (response.data?.data?.space) {
      const space = response.data.data.space;
      console.log(`Space ${spaceId} info: ${space.name} (network: ${space.network || 'unknown'})`);
      return space;
    }
    
    console.log(`No space info found for ${spaceId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching space ${spaceId}:`, error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('=== TESTING SNAPSHOT API ===');
  
  for (const daoId of TEST_DAOS) {
    console.log(`\n=== Testing DAO: ${daoId} ===`);
    
    // Get space info
    const spaceInfo = await getSpace(daoId);
    
    // Get active proposals
    const activeProposals = await getProposals(daoId, 'active');
    
    // Get closed proposals
    const closedProposals = await getProposals(daoId, 'closed');
    
    // Calculate total
    const totalProposals = activeProposals.length + closedProposals.length;
    console.log(`\nTotal proposals for ${daoId}: ${totalProposals}`);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Error running tests:', err);
});
