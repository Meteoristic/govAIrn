// Edge function to add a custom Snapshot DAO to the database
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface SnapshotSpace {
  id: string;
  name: string;
  about: string;
  network: string;
  symbol: string;
  strategies: any[];
  avatar: string;
  terms: string;
  website: string;
  followersCount: number;
}

// Environment variables for Supabase connection
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Snapshot API client
class SnapshotClient {
  private static API_URL = 'https://hub.snapshot.org/graphql';

  /**
   * Fetch details about a Snapshot space
   */
  static async getSpace(spaceId: string): Promise<SnapshotSpace | null> {
    try {
      const query = `
        query {
          space(id: "${spaceId}") {
            id
            name
            about
            network
            symbol
            avatar
            website
            terms
            strategies {
              name
            }
            followersCount
          }
        }
      `;

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      if (data.data?.space) {
        return {
          ...data.data.space,
          // Add defaults for missing fields to avoid errors
          about: data.data.space.about || '',
          network: data.data.space.network || '',
          symbol: data.data.space.symbol || '',
          avatar: data.data.space.avatar || '',
          terms: data.data.space.terms || '',
          website: data.data.space.website || '',
          strategies: data.data.space.strategies || [],
          followersCount: data.data.space.followersCount || 0
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Snapshot space ${spaceId}:`, error);
      return null;
    }
  }

  /**
   * Fetch proposals for a specific space
   */
  static async getProposals(spaceId: string, state: 'active' | 'closed' | 'all' = 'active'): Promise<any[]> {
    try {
      const stateFilter = state === 'all' ? '' : `state: "${state}",`;
      
      const query = `
        query {
          proposals(
            first: 100,
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

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      return data.data?.proposals || [];
    } catch (error) {
      console.error(`Error fetching Snapshot proposals for ${spaceId}:`, error);
      return [];
    }
  }

  /**
   * Get popular spaces with proposal counts
   */
  static async getPopularSpaces(): Promise<any[]> {
    try {
      const query = `
        query {
          spaces(
            first: 50,
            skip: 0,
            orderBy: "proposalsCount",
            orderDirection: desc
          ) {
            id
            name
            network
            followersCount
            proposalsCount
          }
        }
      `;

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      return data.data?.spaces || [];
    } catch (error) {
      console.error('Error fetching popular spaces:', error);
      return [];
    }
  }
}

/**
 * Add a custom DAO from Snapshot space
 */
async function addCustomDAO(
  spaceId: string
): Promise<{
  success: boolean;
  message: string;
  dao?: any;
  proposals?: any;
}> {
  try {
    // Get space data from Snapshot
    const spaceData = await SnapshotClient.getSpace(spaceId);
    
    if (!spaceData) {
      return {
        success: false,
        message: `Failed to fetch data for Snapshot space: ${spaceId}`
      };
    }
    
    // Determine the platform based on the network
    let platform = 'Snapshot';
    if (spaceData.network) {
      // Convert network ID to readable name
      switch (spaceData.network) {
        case '1':
          platform = 'Ethereum';
          break;
        case '8453':
          platform = 'Base';
          break;
        case '10':
          platform = 'Optimism';
          break;
        case '42161':
          platform = 'Arbitrum';
          break;
        case '137':
          platform = 'Polygon';
          break;
        default:
          platform = `Chain ID: ${spaceData.network}`;
      }
    }
    
    // Format data for storage with enhanced details
    const daoData = {
      id: spaceId,
      name: spaceData.name,
      logo_url: spaceData.avatar,
      description: spaceData.about || `${spaceData.name} DAO on Snapshot`,
      platform,
      governance_url: `https://snapshot.org/#/${spaceId}`,
      contract_address: null, // We don't have this from Snapshot
      is_base_ecosystem: platform === 'Base', // Automatically mark Base DAOs
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if DAO already exists
    const { data: existingDAO, error: checkError } = await supabase
      .from('daos')
      .select('id')
      .eq('id', spaceId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      return {
        success: false,
        message: `Error checking for existing DAO: ${checkError.message}`
      };
    }
    
    // Insert or update DAO info
    if (existingDAO) {
      const { error: updateError } = await supabase
        .from('daos')
        .update({
          ...daoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', spaceId);
        
      if (updateError) {
        return {
          success: false,
          message: `Error updating DAO: ${updateError.message}`
        };
      }
    } else {
      const { error: insertError } = await supabase
        .from('daos')
        .insert([daoData]);
        
      if (insertError) {
        return {
          success: false,
          message: `Error inserting DAO: ${insertError.message}`
        };
      }
    }
    
    return {
      success: true,
      message: existingDAO ? `DAO ${spaceId} updated successfully` : `DAO ${spaceId} added successfully`,
      dao: daoData
    };
  } catch (error) {
    return {
      success: false,
      message: `Error adding custom DAO: ${error}`
    };
  }
}

/**
 * Find DAOs with active proposals
 */
async function discoverActiveDAOs(): Promise<{
  success: boolean;
  message: string;
  daos?: any[];
}> {
  try {
    // Get popular spaces first
    const spaces = await SnapshotClient.getPopularSpaces();
    
    if (!spaces || spaces.length === 0) {
      return {
        success: false,
        message: 'No spaces found'
      };
    }
    
    const daosWithActive = [];
    
    // Check each space for active proposals
    for (const space of spaces) {
      const proposals = await SnapshotClient.getProposals(space.id, 'active');
      if (proposals.length > 0) {
        daosWithActive.push({
          ...space,
          activeProposals: proposals.length
        });
      }
    }
    
    return {
      success: true,
      message: `Found ${daosWithActive.length} DAOs with active proposals`,
      daos: daosWithActive
    };
  } catch (error) {
    return {
      success: false,
      message: `Error discovering active DAOs: ${error}`
    };
  }
}

// HTTP request handler
serve(async (req) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    if (req.method === 'POST') {
      const body = await req.json();
      
      if (action === 'discover') {
        const result = await discoverActiveDAOs();
        return new Response(JSON.stringify(result), { headers });
      } else if (action === 'add') {
        const { spaceId } = body;
        
        if (!spaceId) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Missing spaceId parameter'
          }), { headers, status: 400 });
        }
        
        const result = await addCustomDAO(spaceId);
        return new Response(JSON.stringify(result), { headers });
      }
    }
    
    // Default response for unsupported methods/paths
    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid request. Use POST /add or POST /discover'
    }), { headers, status: 400 });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: `Error processing request: ${error}`
    }), { headers, status: 500 });
  }
}); 