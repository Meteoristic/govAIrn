// Script to test the AI decision engine functionality
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set in your environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API key
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Error: VITE_OPENAI_API_KEY must be set in your environment');
  process.exit(1);
}

// Sample persona for testing
const testPersona = {
  risk: 60,
  esg: 70,
  treasury: 50,
  horizon: 80,
  frequency: 20
};

/**
 * Test OpenAI API connectivity
 */
async function testOpenAIConnection() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello, this is a test of the AI decision engine.' }],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    console.log('OpenAI API connection successful!');
    console.log('Model response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error connecting to OpenAI API:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get a sample proposal for testing
 */
async function getSampleProposal() {
  try {
    console.log('Fetching a sample proposal for testing...');
    
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*, daos(*)')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching sample proposal:', error);
      return null;
    }
    
    if (!proposals || proposals.length === 0) {
      console.log('No proposals found. Please add at least one proposal to the database.');
      return null;
    }
    
    console.log(`Found sample proposal: "${proposals[0].title}"`);
    return proposals[0];
  } catch (error) {
    console.error('Error in getSampleProposal:', error);
    return null;
  }
}

/**
 * Test proposal analysis using OpenAI
 */
async function testProposalAnalysis(proposal) {
  try {
    console.log(`\nAnalyzing proposal: "${proposal.title}"`);
    
    // Create a system prompt
    const systemPrompt = `You are GovAIrn, an AI governance advisor for DAOs and web3 communities. Your task is to analyze proposals and provide insights based on the user's governance persona.

USER'S GOVERNANCE PERSONA PREFERENCES (Scale 0-100):
- Risk Tolerance: ${testPersona.risk}/100 (Higher = more risk accepting)
- ESG Focus: ${testPersona.esg}/100 (Higher = more focus on environmental, social, governance)
- Treasury Conservation: ${testPersona.treasury}/100 (Higher = more conservative with treasury)
- Time Horizon: ${testPersona.horizon}/100 (Higher = longer-term outlook)
- Participation Frequency: ${testPersona.frequency}/100 (Higher = more frequent participation)

Analyze the proposal thoroughly and consider:
1. Risks and benefits
2. Financial implications for the DAO
3. Alignment with ESG principles
4. Long-term vs. short-term tradeoffs
5. Potential impact on the DAO's governance`;

    // Create a user prompt
    const userPrompt = `Please analyze this DAO proposal:

TITLE: ${proposal.title}

DESCRIPTION:
${proposal.description || proposal.summary || 'No description provided.'}

${proposal.status ? `STATUS: ${proposal.status}` : ''}

Provide a thorough analysis considering my persona preferences.`;

    // Make API call to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    const analysis = response.data.choices[0].message.content;
    console.log('\nProposal Analysis:');
    console.log('-------------------');
    console.log(analysis);
    
    return analysis;
  } catch (error) {
    console.error('Error in testProposalAnalysis:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test decision generation based on analysis
 */
async function testDecisionGeneration(proposal, analysis) {
  try {
    console.log('\nGenerating decision recommendation...');
    
    // Create a system prompt for decision generation
    const decisionPrompt = `You are GovAIrn, an AI governance advisor making a decision recommendation based on proposal analysis. Your task is to recommend FOR or AGAINST a proposal based on the user's persona values and the analysis of the proposal.

USER'S GOVERNANCE PERSONA PREFERENCES (Scale 0-100):
- Risk Tolerance: ${testPersona.risk}/100 (Higher = more risk accepting)
- ESG Focus: ${testPersona.esg}/100 (Higher = more focus on environmental, social, governance)
- Treasury Conservation: ${testPersona.treasury}/100 (Higher = more conservative with treasury)
- Time Horizon: ${testPersona.horizon}/100 (Higher = longer-term outlook)
- Participation Frequency: ${testPersona.frequency}/100 (Higher = more frequent participation)

Your response must be a structured JSON object with the following format:
{
  "decision": "FOR" or "AGAINST",
  "confidence": number (0-100),
  "reasoning": "Brief explanation for your decision",
  "factors": [
    {
      "name": "Factor name (e.g., Risk, Treasury Impact, ESG Alignment)",
      "value": number (-100 to 100, negative = against, positive = for),
      "weight": number (0-100, indicates importance to decision),
      "explanation": "Brief explanation of this factor's analysis"
    },
    ...more factors
  ],
  "chainOfThought": "Your detailed reasoning process"
}`;

    // Create a user prompt for decision
    const decisionUserPrompt = `Make a decision recommendation for this proposal:

TITLE: ${proposal.title}

ANALYSIS:
${analysis}

Generate a decision recommendation that respects my persona preferences.`;

    // Make API call to OpenAI for structured response
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: decisionPrompt },
          { role: 'user', content: decisionUserPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.2  // Lower temperature for structured outputs
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    // Parse the JSON response
    const responseText = response.data.choices[0].message.content;
    // Clean up the response in case the model included markdown code blocks
    const cleanedJson = responseText.replace(/```json|```/g, '').trim();
    
    try {
      const decision = JSON.parse(cleanedJson);
      
      console.log('\nDecision:');
      console.log('---------');
      console.log(`Vote: ${decision.decision}`);
      console.log(`Confidence: ${decision.confidence}%`);
      console.log(`Reasoning: ${decision.reasoning}`);
      
      console.log('\nFactors:');
      console.log('--------');
      decision.factors.forEach(factor => {
        console.log(`- ${factor.name} (Value: ${factor.value}, Weight: ${factor.weight}%):`);
        console.log(`  ${factor.explanation}`);
      });
      
      return decision;
    } catch (jsonError) {
      console.error('Error parsing decision JSON:', jsonError);
      console.log('Raw response:', responseText);
      return null;
    }
  } catch (error) {
    console.error('Error in testDecisionGeneration:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('Starting AI Decision Engine test...');
  
  // Test OpenAI API connection
  const openaiConnected = await testOpenAIConnection();
  if (!openaiConnected) {
    console.error('Aborting test due to OpenAI API connection failure.');
    process.exit(1);
  }
  
  // Get a sample proposal
  const proposal = await getSampleProposal();
  if (!proposal) {
    console.error('Aborting test due to failure to retrieve a sample proposal.');
    process.exit(1);
  }
  
  // Test proposal analysis
  const analysis = await testProposalAnalysis(proposal);
  if (!analysis) {
    console.error('Aborting test due to failure to analyze the proposal.');
    process.exit(1);
  }
  
  // Test decision generation
  const decision = await testDecisionGeneration(proposal, analysis);
  if (!decision) {
    console.error('Aborting test due to failure to generate a decision.');
    process.exit(1);
  }
  
  console.log('\nAI Decision Engine test completed successfully!');
}

// Run the test
runTest().catch(console.error);
