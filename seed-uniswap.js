// seed-uniswap.js
// A script to add Uniswap DAO to the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUniswapDAO() {
  const uniswapDAO = {
    id: 'uniswapgovernance.eth',
    name: 'Uniswap',
    description: 'Leading decentralized exchange protocol',
    platform: 'Snapshot',
    logo_url: 'https://assets.coingecko.com/coins/images/12504/standard/uniswap-uni.png',
    governance_url: 'https://snapshot.org/#/uniswapgovernance.eth',
    is_base_ecosystem: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Adding Uniswap DAO to database...');

  // Check if DAO already exists
  const { data: existingDAO, error: checkError } = await supabase
    .from('daos')
    .select('*')
    .eq('id', uniswapDAO.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking for existing DAO:', checkError);
    return;
  }

  if (existingDAO) {
    console.log(`Updating existing Uniswap DAO: ${existingDAO.id}`);
    const { error: updateError } = await supabase
      .from('daos')
      .update(uniswapDAO)
      .eq('id', uniswapDAO.id);

    if (updateError) {
      console.error('Error updating DAO:', updateError);
      return;
    }
    console.log('Successfully updated Uniswap DAO');
  } else {
    console.log('Creating new Uniswap DAO entry');
    const { error: insertError } = await supabase
      .from('daos')
      .insert([uniswapDAO]);

    if (insertError) {
      console.error('Error inserting DAO:', insertError);
      return;
    }
    console.log('Successfully added Uniswap DAO to database');
  }
}

seedUniswapDAO()
  .then(() => console.log('Done!'))
  .catch(err => console.error('An error occurred:', err));
