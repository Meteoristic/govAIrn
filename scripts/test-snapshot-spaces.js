import axios from 'axios';

// Test spaces to check
const TEST_SPACES = [
  'ens.eth',     // ENS DAO
  'aavedao.eth', // Aave DAO (confirmed working)
  'compound.eth', // Another popular DAO
  'gitcoindao.eth' // Gitcoin DAO
];

async function getSpace(spaceId) {
  const API_URL = 'https://hub.snapshot.org/graphql';
  
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

  try {
    console.log(`Testing Snapshot space: ${spaceId}`);
    const response = await axios.post(API_URL, { query });
    
    if (response.data?.data?.space) {
      console.log(`✅ Success! Space found:`, response.data.data.space);
      return response.data.data.space;
    } else {
      console.log(`❌ No space found with ID: ${spaceId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching space ${spaceId}:`, error.message);
    return null;
  }
}

async function getProposals(spaceId, state = 'active') {
  const API_URL = 'https://hub.snapshot.org/graphql';
  
  let stateFilter = '';
  if (state && state !== 'all') {
    stateFilter = `state: "${state}",`;
  }
  
  const query = `
    query {
      proposals(
        first: 5,
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

  try {
    console.log(`Testing proposals for space: ${spaceId} (state: ${state})`);
    const response = await axios.post(API_URL, { query });
    
    if (response.data?.data?.proposals) {
      const proposals = response.data.data.proposals;
      console.log(`✅ Found ${proposals.length} ${state} proposals`);
      if (proposals.length > 0) {
        console.log(`   First proposal: "${proposals[0].title}" (${proposals[0].state})`);
      }
      return proposals;
    } else {
      console.log(`❌ No proposals found for space ${spaceId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching proposals for ${spaceId}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 SNAPSHOT API SPACE TESTING');
  console.log('=============================');
  
  for (const spaceId of TEST_SPACES) {
    console.log('\n-----------------------------------------');
    const space = await getSpace(spaceId);
    
    if (space) {
      // If space exists, test both active and closed proposals
      await getProposals(spaceId, 'active');
      await getProposals(spaceId, 'closed');
    }
  }
}

main().catch(console.error);
