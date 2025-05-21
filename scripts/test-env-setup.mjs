// Test script to verify environment variable setup for OpenAI integration
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { OpenAI } from 'openai';
import axios from 'axios';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=============================================');
console.log('ENVIRONMENT SETUP VERIFICATION');
console.log('=============================================');

// Check if .env file exists
const envPath = path.join(rootDir, '.env');
const envExists = fs.existsSync(envPath);
console.log(`\n.env file exists: ${envExists ? '✅ YES' : '❌ NO'}`);

if (envExists) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    console.log(`\n.env file has ${envLines.length} active lines (non-comment)`);
    
    // Check for specific variables without revealing their values
    const hasOpenAIKey = envContent.includes('VITE_OPENAI_API_KEY=');
    console.log(`VITE_OPENAI_API_KEY defined in .env: ${hasOpenAIKey ? '✅ YES' : '❌ NO'}`);
    
    // Check for commented out entries
    const commentedOpenAI = envContent.includes('#VITE_OPENAI_API_KEY=');
    if (commentedOpenAI) {
      console.log(`⚠️ WARNING: VITE_OPENAI_API_KEY appears to be commented out (#)`);
    }
  } catch (error) {
    console.error(`❌ Error reading .env file: ${error.message}`);
  }
}

console.log('\nENVIRONMENT VARIABLES:');
console.log('---------------------------------------------');

// Check Node.js environment variables
const nodeEnv = process.env.NODE_ENV || 'not set';
console.log(`NODE_ENV: ${nodeEnv}`);

// Check for VITE variables
const viteOpenAIKey = process.env.VITE_OPENAI_API_KEY;
console.log(`VITE_OPENAI_API_KEY available: ${viteOpenAIKey ? '✅ YES' : '❌ NO'}`);
if (viteOpenAIKey) {
  console.log(`VITE_OPENAI_API_KEY length: ${viteOpenAIKey.length}`);
  console.log(`VITE_OPENAI_API_KEY first 4 chars: ${viteOpenAIKey.substring(0, 4)}...`);
}

// Check for other Supabase variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
console.log(`VITE_SUPABASE_URL available: ${supabaseUrl ? '✅ YES' : '❌ NO'}`);

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log(`VITE_SUPABASE_ANON_KEY available: ${supabaseKey ? '✅ YES' : '❌ NO'}`);

// Test OpenAI API
async function testOpenAI() {
  console.log('\n=============================================');
  console.log('OPENAI API TEST');
  console.log('=============================================');

  if (!viteOpenAIKey) {
    console.log('❌ Cannot test OpenAI API: No API key found');
    return false;
  }

  try {
    console.log('Testing OpenAI API connection...');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: viteOpenAIKey,
    });

    // Make a simple API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, can you respond with a very short JSON object with a success field set to true?' }
      ],
      max_tokens: 50,
      temperature: 0.2
    });

    console.log('✅ OpenAI API connection successful!');
    console.log('Response:', completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ OpenAI API connection failed:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('OpenAI API response data:', error.response.data);
    }
    
    return false;
  }
}

// Test Snapshot API
async function testSnapshot() {
  console.log('\n=============================================');
  console.log('SNAPSHOT API TEST');
  console.log('=============================================');
  
  try {
    console.log('Testing Snapshot API connection...');
    
    const SNAPSHOT_API = 'https://hub.snapshot.org/graphql';
    const query = `
      query {
        spaces(
          first: 3,
          skip: 0,
          where: {
            id_in: ["aavedao.eth", "ens.eth", "gitcoindao.eth"]
          }
        ) {
          id
          name
        }
      }
    `;
    
    const response = await axios.post(SNAPSHOT_API, { query });
    const spaces = response.data.data.spaces;
    
    console.log('✅ Snapshot API connection successful!');
    console.log('Found spaces:', spaces.map(s => `${s.name} (${s.id})`).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Snapshot API connection failed:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Snapshot API response data:', error.response.data);
    }
    
    return false;
  }
}

// Main function
async function main() {
  // Test third-party API connections
  const openaiSuccess = await testOpenAI();
  const snapshotSuccess = await testSnapshot();
  
  console.log('\n=============================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('=============================================');
  console.log(`.env file:               ${envExists ? '✅ Found' : '❌ Missing'}`);
  console.log(`OpenAI API key:          ${viteOpenAIKey ? '✅ Available' : '❌ Missing'}`);
  console.log(`OpenAI API connection:   ${openaiSuccess ? '✅ Working' : '❌ Failed'}`);
  console.log(`Snapshot API connection: ${snapshotSuccess ? '✅ Working' : '❌ Failed'}`);
  console.log(`Supabase configuration:  ${(supabaseUrl && supabaseKey) ? '✅ Available' : '❌ Incomplete'}`);
  
  // Provide recommendations
  console.log('\n=============================================');
  console.log('RECOMMENDATIONS');
  console.log('=============================================');
  
  if (!envExists) {
    console.log('❌ Create a .env file in the project root directory');
    console.log('   Use .env.example as a template');
  }
  
  if (!viteOpenAIKey) {
    console.log('❌ Add VITE_OPENAI_API_KEY to your .env file with a valid OpenAI API key');
  } else if (!openaiSuccess) {
    console.log('❌ Your OpenAI API key appears to be invalid or has insufficient permissions');
    console.log('   Please check your account at https://platform.openai.com/account/api-keys');
  }
  
  if (viteOpenAIKey && openaiSuccess && envExists) {
    console.log('✅ Your environment is correctly configured for OpenAI integration!');
    console.log('   The ProposalFeed component should now work properly with "Load Live Data"');
  }
  
  console.log('\nIMPORTANT NOTE:');
  console.log('In Vite applications, environment variables must:');
  console.log('1. Be prefixed with VITE_');
  console.log('2. Be present in the .env file at build time');
  console.log('3. Be accessed via import.meta.env.VITE_NAME (not process.env)');
}

// Run the tests
main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 