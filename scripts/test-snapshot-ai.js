// Test script to fetch active proposals from Snapshot and test AI integration
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Snapshot API endpoint
const SNAPSHOT_API = 'https://hub.snapshot.org/graphql';

// Supported DAOs
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
    
    const response = await axios.post(SNAPSHOT_API, { query });
    
    const proposals = response.data.data.proposals;
    console.log(`Found ${proposals.length} ${state} proposals for ${spaceId}`);
    
    return proposals;
  } catch (error) {
    console.error(`Error fetching proposals for ${spaceId}:`, error.message);
    return [];
  }
}

// Generate an AI decision for a proposal
async function generateAIDecision(proposal, personaId = 'default') {
  try {
    console.log(`Generating AI decision for proposal: ${proposal.title}`);
    
    // Use OpenAI API directly for testing
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    const prompt = `
You are an AI assistant helping to analyze a governance proposal. Based on the following proposal, 
generate a decision on how to vote (for, against, or abstain) and provide reasoning.

Proposal Title: ${proposal.title}
Proposal Body: ${proposal.body || 'No description provided'}
Space: ${proposal.space.name}
Choices: ${proposal.choices ? proposal.choices.join(', ') : 'For, Against, Abstain'}

Your response should include:
1. A voting decision (for, against, or abstain)
2. Confidence level (0-100)
3. A short reasoning explanation (1-2 sentences)
4. 2-3 pros (positive factors)
5. 1-2 cons (negative factors)
    `;
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('OpenAI API response:', response.data);
    
    // Extract decision from the response
    const aiText = response.data.choices[0].message.content;
    
    // Parse the AI response into a structured decision
    const decision = parseAIResponse(aiText, proposal.id, personaId);
    
    return decision;
  } catch (error) {
    console.error('Error generating AI decision:', error.message);
    
    // Return fallback decision
    return {
      id: `fallback-${proposal.id}`,
      user_id: 'test-user',
      proposal_id: proposal.id,
      persona_id: personaId,
      decision: 'neutral',
      confidence: 50,
      persona_match: 60,
      reasoning: 'Automatically generated fallback decision due to API error.',
      chain_of_thought: 'Fallback generation',
      created_at: new Date().toISOString(),
      requires_recalculation: false,
      factors: [
        {
          id: `factor-1-${proposal.id}`,
          ai_decision_id: `fallback-${proposal.id}`,
          factor_name: 'Default Pro',
          factor_value: 5,
          factor_weight: 5,
          explanation: 'This is a default positive factor',
          created_at: new Date().toISOString()
        },
        {
          id: `factor-2-${proposal.id}`,
          ai_decision_id: `fallback-${proposal.id}`,
          factor_name: 'Default Con',
          factor_value: -3,
          factor_weight: 3,
          explanation: 'This is a default negative factor',
          created_at: new Date().toISOString()
        }
      ]
    };
  }
}

// Parse AI text response into structured decision
function parseAIResponse(aiText, proposalId, personaId) {
  let decision = 'neutral';
  let confidence = 50;
  let reasoning = '';
  let pros = [];
  let cons = [];
  
  // Extract decision
  if (/decision.*:\s*for/i.test(aiText)) {
    decision = 'for';
  } else if (/decision.*:\s*against/i.test(aiText)) {
    decision = 'against';
  } else if (/decision.*:\s*abstain/i.test(aiText)) {
    decision = 'abstain';
  }
  
  // Extract confidence
  const confidenceMatch = aiText.match(/confidence.*:\s*(\d+)/i);
  if (confidenceMatch && confidenceMatch[1]) {
    confidence = parseInt(confidenceMatch[1], 10);
  }
  
  // Extract reasoning
  const reasoningMatch = aiText.match(/reasoning.*:\s*(.*?)(?:\n|$)/i);
  if (reasoningMatch && reasoningMatch[1]) {
    reasoning = reasoningMatch[1].trim();
  }
  
  // Extract pros
  const prosSection = aiText.match(/pros.*:(?:\s*-\s*(.*?))+(?:\n\n|\n[^-]|$)/is);
  if (prosSection) {
    const proMatches = prosSection[0].matchAll(/-\s*(.*?)(?:\n|$)/g);
    for (const match of proMatches) {
      if (match[1] && match[1].trim()) {
        pros.push(match[1].trim());
      }
    }
  }
  
  // Extract cons
  const consSection = aiText.match(/cons.*:(?:\s*-\s*(.*?))+(?:\n\n|\n[^-]|$)/is);
  if (consSection) {
    const conMatches = consSection[0].matchAll(/-\s*(.*?)(?:\n|$)/g);
    for (const match of conMatches) {
      if (match[1] && match[1].trim()) {
        cons.push(match[1].trim());
      }
    }
  }
  
  // Create decision object
  return {
    id: `ai-${proposalId}`,
    user_id: 'test-user',
    proposal_id: proposalId,
    persona_id: personaId,
    decision: decision,
    confidence: confidence,
    persona_match: Math.round(confidence * 0.9), // Simplistic calculation
    reasoning: reasoning,
    chain_of_thought: aiText,
    created_at: new Date().toISOString(),
    requires_recalculation: false,
    factors: [
      ...pros.map((pro, index) => ({
        id: `factor-pro-${index}-${proposalId}`,
        ai_decision_id: `ai-${proposalId}`,
        factor_name: `Pro ${index + 1}`,
        factor_value: 7,
        factor_weight: 8,
        explanation: pro,
        created_at: new Date().toISOString()
      })),
      ...cons.map((con, index) => ({
        id: `factor-con-${index}-${proposalId}`,
        ai_decision_id: `ai-${proposalId}`,
        factor_name: `Con ${index + 1}`,
        factor_value: -5,
        factor_weight: 6,
        explanation: con,
        created_at: new Date().toISOString()
      }))
    ]
  };
}

// Format a proposal for the UI component
function formatProposalForUI(proposal, aiDecision, daoInfo) {
  // Calculate time remaining
  const end = new Date(proposal.end * 1000);
  const now = new Date();
  const diffMs = end - now;
  
  let timeLeft = 'Ended';
  if (diffMs > 0) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timeLeft = days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  }
  
  // Extract summary from body (first paragraph or first 200 chars)
  let summary = 'No description available.';
  if (proposal.body) {
    const paragraphs = proposal.body.split('\n\n');
    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (cleanPara.length >= 50) {
        summary = cleanPara.length > 200 ? cleanPara.substring(0, 197) + '...' : cleanPara;
        break;
      }
    }
    if (summary === 'No description available.' && proposal.body.length > 0) {
      summary = proposal.body.length > 200 ? proposal.body.substring(0, 197) + '...' : proposal.body;
    }
  }
  
  // Format date strings
  const startTime = new Date(proposal.start * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const endTime = new Date(proposal.end * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Generate mock votes based on proposal id for consistency
  const seed = proposal.id.split('').reduce((a, b) => (a * 31 + b.charCodeAt(0)) & 0xfffffff, 0);
  const randomFactor = seed % 100;
  
  const yesVotes = Math.floor(2000 + randomFactor * 30);
  const noVotes = Math.floor(1000 + randomFactor * 20);
  const abstainVotes = Math.floor(200 + randomFactor * 5);
  const totalVotes = yesVotes + noVotes + abstainVotes;
  
  // Extract pros and cons from AI decision
  const pros = aiDecision.factors
    .filter(f => f.factor_value > 0)
    .map(f => f.explanation);
    
  const cons = aiDecision.factors
    .filter(f => f.factor_value < 0)
    .map(f => f.explanation);
  
  // Determine impact based on AI confidence
  let impact = 'Medium';
  if (aiDecision.confidence > 80) impact = 'High';
  if (aiDecision.confidence < 65) impact = 'Low';
  
  // Format for UI
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.body || '',
    status: proposal.state.charAt(0).toUpperCase() + proposal.state.slice(1),
    url: `https://snapshot.org/#/${proposal.space.id}/proposal/${proposal.id}`,
    votingDeadline: new Date(proposal.end * 1000).toISOString(),
    votingStart: new Date(proposal.start * 1000).toISOString(),
    dao: {
      id: daoInfo.id,
      name: daoInfo.name,
      icon: daoInfo.icon
    },
    votes: {
      yes: yesVotes,
      no: noVotes,
      abstain: abstainVotes,
      total: totalVotes
    },
    ai_decision: aiDecision,
    confidence: aiDecision.confidence,
    personaMatch: aiDecision.persona_match,
    timeLeft: timeLeft,
    summary: summary,
    impact: impact,
    startTime: startTime,
    endTime: endTime,
    votingType: "Simple Majority",
    quorum: "4%",
    pros: pros,
    cons: cons,
    isRealData: true,
    isBaseEcosystem: false
  };
}

// Main function
async function main() {
  try {
    console.log('Starting test script...');
    
    // Step 1: Fetch proposals from each supported DAO
    let allProposals = [];
    
    // Try to find active proposals first
    for (const dao of SUPPORTED_DAOS) {
      const activeProposals = await getSnapshotProposals(dao.id, 'active');
      
      // If no active proposals, try getting recent closed proposals
      const proposals = activeProposals.length > 0 
        ? activeProposals 
        : await getSnapshotProposals(dao.id, 'closed');
      
      // Take max 2 proposals per DAO
      const topProposals = proposals.slice(0, 2).map(p => ({
        ...p,
        dao_info: dao
      }));
      
      allProposals = [...allProposals, ...topProposals];
    }
    
    if (allProposals.length === 0) {
      throw new Error('No proposals found from any supported DAOs');
    }
    
    console.log(`Found total of ${allProposals.length} proposals`);
    
    // Step 2: Process the first proposal with AI
    const testProposal = allProposals[0];
    console.log(`Selected test proposal: "${testProposal.title}" from ${testProposal.space.name}`);
    
    // Step 3: Generate AI decision
    const aiDecision = await generateAIDecision(testProposal);
    
    // Step 4: Format proposal for UI
    const formattedProposal = formatProposalForUI(
      testProposal,
      aiDecision,
      testProposal.dao_info
    );
    
    // Print results
    console.log('\n--- AI Decision ---');
    console.log(`Decision: ${aiDecision.decision}`);
    console.log(`Confidence: ${aiDecision.confidence}`);
    console.log(`Reasoning: ${aiDecision.reasoning}`);
    console.log('Pros:', aiDecision.factors.filter(f => f.factor_value > 0).map(f => f.explanation));
    console.log('Cons:', aiDecision.factors.filter(f => f.factor_value < 0).map(f => f.explanation));
    
    console.log('\n--- Formatted for UI ---');
    console.log(JSON.stringify(formattedProposal, null, 2));
    
    // Save to output file for review
    const outputPath = path.join(__dirname, 'proposal-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(formattedProposal, null, 2));
    console.log(`\nSaved formatted proposal to ${outputPath}`);
    
    // If any DAO needs to be created in the database
    console.log('\nEnsuring DAOs exist in database...');
    for (const dao of SUPPORTED_DAOS) {
      const { data: existingDao } = await supabase
        .from('daos')
        .select('*')
        .eq('snapshot_id', dao.id)
        .single();
      
      if (!existingDao) {
        console.log(`Creating DAO ${dao.name} in database...`);
        const { error } = await supabase
          .from('daos')
          .insert({
            name: dao.name,
            snapshot_id: dao.id,
            icon: dao.icon
          });
        
        if (error) {
          console.error(`Error creating DAO ${dao.name}:`, error);
        } else {
          console.log(`Created DAO: ${dao.name}`);
        }
      } else {
        console.log(`DAO ${dao.name} already exists in database`);
      }
    }
    
    // Save proposal to database
    console.log('\nSaving proposal to database...');
    const { data: daoData } = await supabase
      .from('daos')
      .select('*')
      .eq('snapshot_id', testProposal.space.id)
      .single();
    
    if (!daoData) {
      throw new Error(`DAO not found for space: ${testProposal.space.id}`);
    }
    
    // Check if proposal already exists
    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('*')
      .eq('snapshot_id', testProposal.id)
      .single();
    
    if (!existingProposal) {
      // Create proposal
      const { data: newProposal, error } = await supabase
        .from('proposals')
        .insert({
          dao_id: daoData.id,
          title: testProposal.title,
          description: testProposal.body || '',
          start_time: new Date(testProposal.start * 1000).toISOString(),
          end_time: new Date(testProposal.end * 1000).toISOString(),
          status: testProposal.state,
          url: `https://snapshot.org/#/${testProposal.space.id}/proposal/${testProposal.id}`,
          snapshot_id: testProposal.id,
          choices: testProposal.choices,
          snapshot: testProposal.snapshot
        })
        .select();
      
      if (error) {
        console.error('Error saving proposal:', error);
      } else {
        console.log('Proposal saved successfully!');
        
        // Save AI decision
        const { error: aiError } = await supabase
          .from('ai_decisions')
          .insert({
            user_id: 'test-user',
            proposal_id: newProposal[0].id,
            persona_id: aiDecision.persona_id,
            decision: aiDecision.decision,
            confidence: aiDecision.confidence,
            persona_match: aiDecision.persona_match,
            reasoning: aiDecision.reasoning,
            chain_of_thought: aiDecision.chain_of_thought
          });
        
        if (aiError) {
          console.error('Error saving AI decision:', aiError);
        } else {
          console.log('AI decision saved successfully!');
        }
      }
    } else {
      console.log('Proposal already exists in database');
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the main function
main();
