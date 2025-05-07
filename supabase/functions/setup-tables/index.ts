// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log(`Setup tables function running.`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Setup tables
    const setupResult = await setupTables(supabaseClient)

    // Return the result
    return new Response(JSON.stringify(setupResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function setupTables(supabase) {
  try {
    // Create profiles table if it doesn't exist
    await supabase.rpc('create_profiles_table')

    // Create other necessary tables
    await Promise.all([
      supabase.rpc('create_daos_table'),
      supabase.rpc('create_proposals_table'),
      supabase.rpc('create_votes_table'),
      supabase.rpc('create_personas_table')
    ])

    return { success: true, message: 'Database tables created successfully' }
  } catch (error) {
    console.error('Error setting up tables:', error)
    return { success: false, error: error.message }
  }
}
