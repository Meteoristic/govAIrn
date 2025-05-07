// This script creates a user in Supabase with a wallet address
// Run this script with: node scripts/create-wallet-user.js <wallet-address>

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize environment variables
dotenv.config();

// Get wallet address from command line
const walletAddress = process.argv[2]?.toLowerCase();

if (!walletAddress) {
  console.error('Please provide a wallet address: node scripts/create-wallet-user.js <wallet-address>');
  process.exit(1);
}

// Validate wallet address format (basic check)
if (!walletAddress.match(/^0x[a-f0-9]{40}$/i)) {
  console.error('Invalid Ethereum wallet address format. Should be like: 0x1234...abcd');
  process.exit(1);
}

// Create Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate deterministic password based on wallet address
async function generatePassword(address) {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(address + "govairn-salt");
      resolve(hash.digest('hex'));
    } catch (err) {
      reject(err);
    }
  });
}

const createUser = async () => {
  try {
    console.log(`Creating user for wallet address: ${walletAddress}`);
    
    // Email for Supabase Auth
    const email = `${walletAddress}@wallet.govairn.eth`;
    
    // Generate password
    const password = await generatePassword(walletAddress);
    
    // Create the user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        wallet_address: walletAddress,
      }
    });
    
    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }
    
    console.log('User created successfully!');
    console.log('User ID:', data.user.id);
    
    // Create profile entry
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        wallet_address: walletAddress,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString()
      }]);
    
    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      return;
    }
    
    console.log('Profile created successfully!');
    
    // Create wallet_addresses entry
    const { error: walletError } = await supabase
      .from('wallet_addresses')
      .insert([{
        user_id: data.user.id,
        wallet_address: walletAddress,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (walletError) {
      console.error('Error creating wallet record:', walletError.message);
      return;
    }
    
    console.log('Wallet record created successfully!');
    console.log(' User setup complete! You can now sign in with your wallet.');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
};

createUser();
