// Simple direct test script for Snapshot API and OpenAI integration
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Snapshot API endpoint
const SNAPSHOT_API = 'https://hub.snapshot.org/graphql';

// Supported DAOs to test
const SUPPORTED_DAOS = [
  { id: "aave.eth", name: "Aave", icon: "A" },
  { id: "ens.eth", name: "ENS", icon: "E" },
  { id: "gitcoindao.eth", name: "Gitcoin", icon: "G" }
];

// Helper function to get proposals from Snapshot
async function getSnapshotProposals(spaceId, state = 'active') {
  try {
    console.log(`Fetching ${state} proposals for ${spaceId}...`);
    
    const stateFilter = state === 'all' ? '' : `state: "${state}"`;
    
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
    
    const response = await axios.post(SNAPSHOT_API, { query });
    
    const proposals = response.data.data.proposals;
    console.log(`Found ${proposals.length} ${state} proposals for ${spaceId}`);
    
    return proposals;
  } catch (error) {
    console.error(`Error fetching proposals for ${spaceId}:`, error.message);
    return [];
  }
}

// Main function
async function main() {
  try {
    console.log('Starting direct test script...');
    
    // Print all environment variables to check if OpenAI key is set
    console.log('Checking environment variables...');
    const envVars = Object.keys(process.env);
    console.log('Available environment variables:', envVars);
    
    // Check if OpenAI key is set
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.log('Warning: OPENAI_API_KEY is not set in environment variables');
      console.log('Note: This might be using a different variable name in the app configuration');
    } else {
      console.log('OPENAI_API_KEY is set (length:', openaiKey.length, 'chars)');
    }
    
    // Check for any OpenAI-related variables
    const openaiVars = envVars.filter(key => key.toLowerCase().includes('openai') || key.toLowerCase().includes('ai') || key.toLowerCase().includes('gpt'));
    if (openaiVars.length > 0) {
      console.log('Found OpenAI-related environment variables:', openaiVars);
    }
    
    // Step 2: Fetch proposals from each supported DAO without requiring OpenAI
    let allProposals = [];
    
    // Try to find active proposals first
    for (const dao of SUPPORTED_DAOS) {
      const activeProposals = await getSnapshotProposals(dao.id, 'active');
      
      if (activeProposals.length > 0) {
        allProposals = [...allProposals, ...activeProposals.map(p => ({...p, dao_info: dao}))];
      } else {
        // If no active proposals, try getting recent closed proposals
        const closedProposals = await getSnapshotProposals(dao.id, 'closed');
        allProposals = [...allProposals, ...closedProposals.slice(0, 2).map(p => ({...p, dao_info: dao}))];
      }
    }
    
    if (allProposals.length === 0) {
      throw new Error('No proposals found from any supported DAOs');
    }
    
    console.log(`\nFound total of ${allProposals.length} proposals`);
    
    // Step 3: Process the first proposal with mock AI data
    const testProposal = allProposals[0];
    console.log(`\nSelected test proposal: "${testProposal.title}" from ${testProposal.space.name}`);
    
    // Print a formatted version of the proposal for the UI with mock AI decision
    console.log('\nFormatted proposal object for UI component:');
    const formattedProposal = {
      id: testProposal.id,
      title: testProposal.title,
      status: testProposal.state.charAt(0).toUpperCase() + testProposal.state.slice(1),
      dao: {
        name: testProposal.dao_info.name,
        icon: testProposal.dao_info.icon
      },
      timeLeft: calculateTimeLeft(testProposal.end * 1000),
      summary: extractSummary(testProposal.body),
      aiDecision: createMockAIDecision(testProposal)
    };
    
    console.log(JSON.stringify(formattedProposal, null, 2));
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nError in test script:', error);
  }
}

// Helper function to calculate time remaining
function calculateTimeLeft(endTime) {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return days > 0 ? 
    `${days}d ${hours}h remaining` : 
    `${hours}h remaining`;
}

// Helper function to extract a summary from proposal body
function extractSummary(body) {
  if (!body) return "No description available.";
  
  // Take first paragraph that's at least 50 chars
  const paragraphs = body.split('\n\n');
  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (cleanPara.length >= 50) {
      return cleanPara.length > 200 ? cleanPara.substring(0, 197) + '...' : cleanPara;
    }
  }
  
  // Fallback to first 200 chars
  return body.length > 200 ? body.substring(0, 197) + '...' : body;
}

// Create a mock AI decision for testing
function createMockAIDecision(proposal) {
  // Create a deterministic random value based on proposal ID
  const seed = proposal.id.split('').reduce((a, b) => (a * 31 + b.charCodeAt(0)) & 0xfffffff, 0);
  const randomFactor = (seed % 40) + 60; // 60-99 range for confidence
  
  return {
    id: `mock-ai-${proposal.id}`,
    proposal_id: proposal.id,
    decision: seed % 3 === 0 ? 'against' : 'for', // Deterministic decision
    confidence: randomFactor,
    persona_match: randomFactor - 5,
    reasoning: `This is a mock AI decision for testing the "${proposal.title}" proposal.`,
    chain_of_thought: 'Mock AI decision generated for testing purposes.'
  };
}

// Run the main function
main();
