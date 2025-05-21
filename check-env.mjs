// Script to check environment variables directly
// Run with: node check-env.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

console.log('=============================================');
console.log('ENVIRONMENT VARIABLE CHECK');
console.log('=============================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);
console.log(`\n.env file exists: ${envExists ? 'YES' : 'NO'}`);

if (envExists) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() !== '');
    console.log(`\n.env file has ${envLines.length} lines`);
    
    // Check for specific variables without revealing their values
    const hasOpenAIKey = envContent.includes('VITE_OPENAI_API_KEY=');
    console.log(`VITE_OPENAI_API_KEY defined in .env: ${hasOpenAIKey ? 'YES' : 'NO'}`);
    
    // Check for commented out entries
    const commentedOpenAI = envContent.includes('#VITE_OPENAI_API_KEY=');
    if (commentedOpenAI) {
      console.log(`WARNING: VITE_OPENAI_API_KEY appears to be commented out (#)`);
    }
  } catch (error) {
    console.error(`Error reading .env file: ${error.message}`);
  }
}

console.log('\nENVIRONMENT VARIABLES:');
console.log('---------------------------------------------');

// Check Node.js environment variables
const nodeEnv = process.env.NODE_ENV || 'not set';
console.log(`NODE_ENV: ${nodeEnv}`);

// Check for VITE variables (which might not be available in Node.js environment)
const viteOpenAIKey = process.env.VITE_OPENAI_API_KEY;
console.log(`VITE_OPENAI_API_KEY available: ${viteOpenAIKey ? 'YES' : 'NO'}`);
if (viteOpenAIKey) {
  console.log(`VITE_OPENAI_API_KEY length: ${viteOpenAIKey.length}`);
  console.log(`VITE_OPENAI_API_KEY first 4 chars: ${viteOpenAIKey.substring(0, 4)}...`);
}

// Check for regular OpenAI key
const openaiKey = process.env.OPENAI_API_KEY;
console.log(`OPENAI_API_KEY available: ${openaiKey ? 'YES' : 'NO'}`);
if (openaiKey) {
  console.log(`OPENAI_API_KEY length: ${openaiKey.length}`);
  console.log(`OPENAI_API_KEY first 4 chars: ${openaiKey.substring(0, 4)}...`);
}

// Check for other Supabase variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
console.log(`VITE_SUPABASE_URL available: ${supabaseUrl ? 'YES' : 'NO'}`);

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log(`VITE_SUPABASE_ANON_KEY available: ${supabaseKey ? 'YES' : 'NO'}`);

console.log('\nALL NODE ENVIRONMENT VARIABLES:');
console.log('---------------------------------------------');
const envVarCount = Object.keys(process.env).length;
console.log(`Total environment variables: ${envVarCount}`);

// List all environment variables that might be related to OpenAI
const openaiRelatedVars = Object.keys(process.env).filter(key => 
  key.toLowerCase().includes('openai') || 
  key.toLowerCase().includes('gpt') ||
  key.toLowerCase().includes('api_key')
);

if (openaiRelatedVars.length > 0) {
  console.log('\nOpenAI-related environment variables:');
  openaiRelatedVars.forEach(key => {
    const value = process.env[key];
    console.log(`- ${key}: ${value ? '(value exists)' : '(no value)'}`);
  });
} else {
  console.log('\nNo OpenAI-related environment variables found.');
}

console.log('\n=============================================');
console.log('Check complete!');
console.log('=============================================');

// Instructions for future debugging
console.log('\nIMPORTANT:');
console.log('- Vite applications only load variables prefixed with "VITE_"');
console.log('- In browser, Vite uses import.meta.env instead of process.env');
console.log('- Environment variables are loaded at build time, not runtime');
console.log('\nFor testing in browser, try:');
console.log('localStorage.setItem("OPENAI_API_KEY", "your-key-here");');
console.log('And then check if that makes a difference.\n'); 