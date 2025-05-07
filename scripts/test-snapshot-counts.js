// Script to test Snapshot API and validate proposal counts
import axios from 'axios';

const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
const TEST_SPACES = ['ens.eth', 'gitcoindao.eth', 'aavedao.eth'];

// Direct test of Snapshot API count query
async function testProposalCount(spaceId) {
  console.log(`\n=== TESTING PROPOSAL COUNT FOR ${spaceId} ===`);
  
  try {
    // Method 1: Using space query with proposalsCount field
    const spaceQuery = `
      query {
        space(id: "${spaceId}") {
          id
          name
          proposalsCount
        }
      }
    `;
    
    const spaceResponse = await axios.post(SNAPSHOT_API_URL, { query: spaceQuery });
    const spaceCount = spaceResponse.data?.data?.space?.proposalsCount || 0;
    console.log(`Space proposalsCount: ${spaceCount}`);
    
    // Method 2: Using direct count query for active proposals
    const activeCountQuery = `
      query {
        proposals(
          where: {
            space: "${spaceId}",
            state: "active"
          }
        ) {
          id
        }
      }
    `;
    
    // Method 3: Using direct count query for closed proposals
    const closedCountQuery = `
      query {
        proposals(
          first: 1000,
          skip: 0,
          where: {
            space: "${spaceId}",
            state: "closed"
          }
        ) {
          id
        }
      }
    `;
    
    const [activeResponse, closedResponse] = await Promise.all([
      axios.post(SNAPSHOT_API_URL, { query: activeCountQuery }),
      axios.post(SNAPSHOT_API_URL, { query: closedCountQuery })
    ]);
    
    const activeCount = activeResponse.data?.data?.proposals?.length || 0;
    const closedCount = closedResponse.data?.data?.proposals?.length || 0;
    const totalCount = activeCount + closedCount;
    
    console.log(`Active proposals: ${activeCount}`);
    console.log(`Closed proposals: ${closedCount}`);
    console.log(`Calculated total: ${totalCount}`);
    
    // Method 4: Direct proposals query with filter but no state
    const allProposalsQuery = `
      query {
        proposals(
          first: 1000,
          skip: 0,
          where: {
            space: "${spaceId}"
          }
        ) {
          id
          state
        }
      }
    `;
    
    const allProposalsResponse = await axios.post(SNAPSHOT_API_URL, { query: allProposalsQuery });
    const allProposals = allProposalsResponse.data?.data?.proposals || [];
    
    console.log(`All proposals fetched: ${allProposals.length}`);
    
    // Analyze discrepancy
    console.log(`\nCOMPARISON:`);
    console.log(`Space API count: ${spaceCount}`);
    console.log(`Our calculated total: ${totalCount}`);
    console.log(`All proposals query count: ${allProposals.length}`);
    console.log(`Difference (space vs calculated): ${spaceCount - totalCount}`);
    
    return {
      spaceId,
      spaceCount,
      activeCount,
      closedCount,
      totalCount,
      allCount: allProposals.length
    };
  } catch (error) {
    console.error(`Error testing ${spaceId}:`, error.message);
    return { 
      spaceId, 
      error: error.message,
      spaceCount: 0,
      activeCount: 0,
      closedCount: 0,
      totalCount: 0,
      allCount: 0
    };
  }
}

// Test governance health metrics data availability
async function testGovernanceMetrics(spaceId) {
  console.log(`\n=== TESTING GOVERNANCE METRICS FOR ${spaceId} ===`);
  
  try {
    // Query for governance metrics data
    const query = `
      query {
        proposals(
          first: 10,
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
          start
          end
          scores_total
          votes
          scores
          quorum
        }
        space(id: "${spaceId}") {
          id
          name
          votesCount
          followersCount
          proposalsCount
        }
      }
    `;
    
    const response = await axios.post(SNAPSHOT_API_URL, { query });
    const proposals = response.data?.data?.proposals || [];
    const space = response.data?.data?.space || {};
    
    console.log(`Space: ${space.name}`);
    console.log(`Total votes in space: ${space.votesCount}`);
    console.log(`Total followers: ${space.followersCount}`);
    console.log(`Recent proposals fetched: ${proposals.length}`);
    
    if (proposals.length > 0) {
      // Sample the first proposal for metrics
      const sample = proposals[0];
      console.log(`\nSample proposal: ${sample.title}`);
      console.log(`- Votes: ${sample.votes || 'N/A'}`);
      console.log(`- Total score: ${sample.scores_total || 'N/A'}`);
      console.log(`- Has scores array: ${sample.scores ? 'Yes' : 'No'}`);
      console.log(`- Quorum: ${sample.quorum || 'N/A'}`);
      
      // Calculate turnout (approximate)
      const turnoutData = proposals
        .filter(p => p.scores_total && p.votes)
        .map(p => ({ 
          scores_total: p.scores_total, 
          votes: p.votes 
        }));
      
      console.log(`\nTurnout data available for ${turnoutData.length} proposals`);
    }
    
    return {
      spaceId,
      hasMetricsData: proposals.length > 0,
      proposalsWithScores: proposals.filter(p => p.scores_total).length,
      proposalsWithVotes: proposals.filter(p => p.votes).length,
      spaceFollowers: space.followersCount || 0,
      spaceVotes: space.votesCount || 0
    };
  } catch (error) {
    console.error(`Error testing metrics for ${spaceId}:`, error.message);
    return { 
      spaceId, 
      error: error.message,
      hasMetricsData: false
    };
  }
}

// Main test function
async function runTests() {
  console.log('======= SNAPSHOT API TESTING =======');
  console.log('Testing proposal counts and metrics data\n');
  
  const countResults = [];
  const metricsResults = [];
  
  for (const spaceId of TEST_SPACES) {
    try {
      const countResult = await testProposalCount(spaceId);
      countResults.push(countResult);
      
      const metricsResult = await testGovernanceMetrics(spaceId);
      metricsResults.push(metricsResult);
    } catch (error) {
      console.error(`Failed to test ${spaceId}:`, error);
    }
  }
  
  // Summary
  console.log('\n======= SUMMARY =======');
  console.log('Proposal Count Results:');
  countResults.forEach(result => {
    console.log(`${result.spaceId}: API Count=${result.spaceCount}, Active=${result.activeCount}, Closed=${result.closedCount}, Total=${result.totalCount}`);
  });
  
  console.log('\nMetrics Data Availability:');
  metricsResults.forEach(result => {
    console.log(`${result.spaceId}: Has data=${result.hasMetricsData}, Proposals with scores=${result.proposalsWithScores}, Proposals with votes=${result.proposalsWithVotes}`);
  });
}

runTests().catch(console.error);
