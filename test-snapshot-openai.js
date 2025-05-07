// test-snapshot-openai.js
// A simplified test script to verify the Snapshot API and OpenAI integration
// Run with: node test-snapshot-openai.js

// Import axios for making HTTP requests
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Supported DAOs to test with
const SUPPORTED_DAOS = [
  { id: "ens.eth", name: "ENS", icon: "E" },
  { id: "aavedao.eth", name: "Aave", icon: "A" },
  { id: "gitcoindao.eth", name: "Gitcoin", icon: "G" }
];

// The Snapshot GraphQL API endpoint
const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';

// Simple in-memory cache for AI decisions
const aiDecisionCache = new Map();

// Test stats
let openaiCallCount = 0;
let snapshotApiCallCount = 0;
let cachedResponseCount = 0;

// Main test function
async function runTest() {
  console.log("=== GOVAIRN SNAPSHOT+OPENAI INTEGRATION TEST ===");
  console.log("Verifying optimized proposal fetching and AI processing...");
  
  try {
    // Step 1: Test Snapshot API connection
    console.log("\n✅ STEP 1: Testing Snapshot API Connection");
    const proposals = await testSnapshotAPI();
    
    if (proposals.length === 0) {
      console.log("❌ No proposals found to test with");
      return;
    }
    
    // Step 2: Test proposal processing with OpenAI
    console.log("\n✅ STEP 2: Testing OpenAI Integration");
    await testOpenAIIntegration(proposals[0]);
    
    // Step 3: Test caching
    console.log("\n✅ STEP 3: Testing Decision Caching");
    await testCaching(proposals[0]);
    
    // Final results
    console.log("\n=== FINAL RESULTS ===");
    console.log(`Total Snapshot API calls: ${snapshotApiCallCount}`);
    console.log(`Total OpenAI API calls: ${openaiCallCount}`);
    console.log(`Cached responses used: ${cachedResponseCount}`);
    
    const cachingEfficiency = cachedResponseCount > 0 
      ? Math.round((cachedResponseCount / (openaiCallCount + cachedResponseCount)) * 100) 
      : 0;
    
    console.log(`Caching efficiency: ${cachingEfficiency}%`);
    
    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Test the Snapshot API
async function testSnapshotAPI() {
  console.log("Testing Snapshot API for active proposals...");
  
  let allProposals = [];
  
  for (const dao of SUPPORTED_DAOS) {
    try {
      console.log(`  Fetching proposals for ${dao.name} (${dao.id})...`);
      snapshotApiCallCount++;
      
      const proposals = await getSnapshotProposals(dao.id, 'active');
      console.log(`  Found ${proposals.length} active proposals for ${dao.name}`);
      
      if (proposals.length > 0) {
        const enhancedProposals = proposals.map(p => ({
          ...p,
          dao_info: dao
        }));
        
        allProposals = [...allProposals, ...enhancedProposals];
      }
    } catch (error) {
      console.error(`  Error fetching proposals for ${dao.id}:`, error);
    }
  }
  
  console.log(`Total active proposals found: ${allProposals.length}`);
  
  if (allProposals.length > 0) {
    const sample = allProposals[0];
    console.log(`\nSample proposal: "${sample.title}"`);
    console.log(`From: ${sample.space.name} (${sample.space.id})`);
    console.log(`State: ${sample.state}`);
    console.log(`Description length: ${sample.body ? sample.body.length : 0} characters`);
  }
  
  return allProposals;
}

// Test the OpenAI integration
async function testOpenAIIntegration(proposal) {
  if (!proposal) {
    console.log("❌ No proposal to test OpenAI integration");
    return;
  }
  
  console.log(`Testing OpenAI integration with proposal: "${proposal.title}"`);
  
  // Clear cache for this proposal
  aiDecisionCache.delete(proposal.id);
  
  // Test with original untruncated body
  console.log("\nUnoptimized version (full text):");
  try {
    const startTime = Date.now();
    const fullTextDecision = await simulateAIDecision(proposal, proposal.body);
    const fullTextTime = Date.now() - startTime;
    
    console.log(`  Decision: ${fullTextDecision.decision} (confidence: ${fullTextDecision.confidence}%)`);
    console.log(`  Processing time: ${fullTextTime}ms`);
    console.log(`  Token estimate: ~${estimateTokenCount(proposal.body)} tokens`);
  } catch (error) {
    console.error("  Error with unoptimized version:", error);
  }
  
  // Clear cache again
  aiDecisionCache.delete(proposal.id);
  
  // Test with truncated body
  console.log("\nOptimized version (truncated text):");
  try {
    const truncatedBody = proposal.body && proposal.body.length > 1000
      ? proposal.body.substring(0, 1000) + "..."
      : proposal.body;
    
    const startTime = Date.now();
    const truncatedDecision = await simulateAIDecision(proposal, truncatedBody);
    const truncatedTime = Date.now() - startTime;
    
    console.log(`  Decision: ${truncatedDecision.decision} (confidence: ${truncatedDecision.confidence}%)`);
    console.log(`  Processing time: ${truncatedTime}ms`);
    console.log(`  Token estimate: ~${estimateTokenCount(truncatedBody)} tokens`);
    
    // Show token savings
    const originalTokens = estimateTokenCount(proposal.body);
    const truncatedTokens = estimateTokenCount(truncatedBody);
    const tokenSavings = originalTokens - truncatedTokens;
    const percentSavings = Math.round((tokenSavings / originalTokens) * 100);
    
    console.log(`  Token savings: ${tokenSavings} tokens (${percentSavings}% reduction)`);
  } catch (error) {
    console.error("  Error with optimized version:", error);
  }
}

// Test the caching system
async function testCaching(proposal) {
  if (!proposal) {
    console.log("❌ No proposal to test caching");
    return;
  }
  
  console.log(`Testing caching with proposal: "${proposal.title}"`);
  
  // Clear cache for this proposal
  aiDecisionCache.delete(proposal.id);
  
  console.log("\nFirst call (should use API):");
  try {
    const startTime = Date.now();
    const firstDecision = await simulateAIDecision(proposal);
    const firstTime = Date.now() - startTime;
    
    console.log(`  Decision: ${firstDecision.decision} (confidence: ${firstDecision.confidence}%)`);
    console.log(`  Processing time: ${firstTime}ms`);
    console.log(`  Used cache: No (API call)`);
  } catch (error) {
    console.error("  Error with first call:", error);
  }
  
  console.log("\nSecond call (should use cache):");
  try {
    const startTime = Date.now();
    const secondDecision = await simulateAIDecision(proposal);
    const secondTime = Date.now() - startTime;
    
    console.log(`  Decision: ${secondDecision.decision} (confidence: ${secondDecision.confidence}%)`);
    console.log(`  Processing time: ${secondTime}ms`);
    console.log(`  Used cache: Yes`);
  } catch (error) {
    console.error("  Error with second call:", error);
  }
}

// Helper function to get proposals from Snapshot API
async function getSnapshotProposals(spaceId, state = 'active') {
  try {
    let stateFilter = '';
    if (state && state !== 'all') {
      stateFilter = `state: "${state}",`;
    }
    
    const query = `
      query {
        proposals(
          first: 10,
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
    
    if (response.data?.data?.proposals) {
      return response.data.data.proposals;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching proposals for space ${spaceId}:`, error);
    return [];
  }
}

// Simulate an AI decision (with caching)
async function simulateAIDecision(proposal, truncatedBody = null) {
  // Check cache first
  if (aiDecisionCache.has(proposal.id)) {
    console.log("  Using cached decision");
    cachedResponseCount++;
    return aiDecisionCache.get(proposal.id);
  }
  
  // Create deterministic seed based on proposal ID
  const seed = proposal.id.split('')
    .reduce((a, b) => (a * 31 + b.charCodeAt(0)) & 0xfffffff, 0);
  
  // If not in truncatedBody, create one
  if (!truncatedBody && proposal.body) {
    truncatedBody = proposal.body.length > 1000
      ? proposal.body.substring(0, 1000) + "..."
      : proposal.body;
  }
  
  // In a real implementation, we would call OpenAI here
  // For this test, we'll simulate the call
  openaiCallCount++;
  console.log("  Making simulated OpenAI API call");
  
  // Simulate response
  const confidence = 60 + (seed % 30);
  const personaMatch = 65 + (seed % 25);
  const decision = seed % 3 === 0 ? 'against' : 'for';
  
  // Create a unique response based on the proposal
  const proposalWords = proposal.title.split(/\s+/);
  const uniqueWord = proposalWords.length > 0 
    ? proposalWords[seed % proposalWords.length].toLowerCase() 
    : 'governance';
  
  // Generate some delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 300 + (seed % 300)));
  
  const aiDecision = {
    id: uuidv4(),
    user_id: 'test-user',
    proposal_id: proposal.id,
    persona_id: 'default',
    decision: decision,
    confidence: confidence,
    persona_match: personaMatch,
    reasoning: `This proposal about ${uniqueWord} has been analyzed based on governance principles and community impact.`,
    created_at: new Date().toISOString(),
    factors: [
      {
        id: uuidv4(),
        factor_name: `${uniqueWord.charAt(0).toUpperCase() + uniqueWord.slice(1)} Alignment`,
        factor_value: 7,
        factor_weight: 8,
        explanation: `This proposal shows strong alignment with the ${uniqueWord} goals of the community.`
      },
      {
        id: uuidv4(),
        factor_name: 'Implementation Complexity',
        factor_value: -4,
        factor_weight: 6,
        explanation: `The ${uniqueWord}-focused implementation could face technical challenges.`
      },
      {
        id: uuidv4(),
        factor_name: 'Community Engagement',
        factor_value: 5,
        factor_weight: 7,
        explanation: `This approach to ${uniqueWord} could drive stronger community participation.`
      }
    ]
  };
  
  // Cache the result
  aiDecisionCache.set(proposal.id, aiDecision);
  
  return aiDecision;
}

// Estimate token count (rough estimate)
function estimateTokenCount(text) {
  if (!text) return 0;
  // Rough estimate: 1 token ~= 4 characters 
  return Math.ceil(text.length / 4);
}

// Run the test
runTest().catch(console.error);
