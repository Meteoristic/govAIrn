// Edge function to initialize Base ecosystem DAOs with accurate information from Snapshot
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

// List of Base ecosystem DAOs to initialize
const BASE_ECOSYSTEM_DAOS = [
  {
    id: 'ens.eth',  // Verified working Snapshot space ID
    name: 'ENS',
    platform: 'Snapshot',
    description: 'Ethereum Name Service DAO',
    isBaseSpecific: true,
    fallbackId: 'ens' 
  },
  {
    id: 'gitcoindao.eth',  // Verified working Snapshot space ID
    name: 'Gitcoin',
    platform: 'Snapshot',
    description: 'Public goods funding protocol',
    isBaseSpecific: true,
    fallbackId: 'gitcoin'
  },
  {
    id: 'aavedao.eth',  // Verified working Snapshot space ID
    name: 'Aave',
    platform: 'Snapshot',
    description: 'Liquidity protocol available on Base',
    isBaseSpecific: true,
    fallbackId: 'aave'
  }
];

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
}

/**
 * Initialize a single DAO with accurate information from Snapshot
 */
async function initDAO(
  daoConfig: typeof BASE_ECOSYSTEM_DAOS[0],
  result: { added: number, updated: number, failed: number }
): Promise<void> {
  try {
    // Get space data from Snapshot
    const spaceData = await SnapshotClient.getSpace(daoConfig.id);
    
    if (!spaceData) {
      console.error(`Failed to fetch data for Snapshot space: ${daoConfig.id}`);
      result.failed++;
      return;
    }
    
    // Get active proposals count
    const activeProposals = await SnapshotClient.getProposals(daoConfig.id, 'active');
    const proposalCount = activeProposals.length;
    
    // Determine the platform based on the network
    let platform = 'Unknown';
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
    } else {
      platform = 'Snapshot'; // Default if no network specified
    }
    
    // Check if DAO already exists
    const { data: existingDAO, error: checkError } = await supabase
      .from('daos')
      .select('id')
      .eq('id', daoConfig.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`Error checking for existing DAO ${daoConfig.id}:`, checkError);
    }
    
    // Format data for storage with enhanced details
    const daoData = {
      id: daoConfig.id,
      name: spaceData.name || daoConfig.name,
      logo_url: spaceData.avatar,
      description: spaceData.about || daoConfig.description,
      platform,
      governance_url: `https://snapshot.org/#/${daoConfig.id}`,
      proposal_count: proposalCount,
      network: spaceData.network,
      contract_address: null, // We don't have this from Snapshot
      is_base_ecosystem: true,
      updated_at: new Date().toISOString()
    };
    
    // Insert or update DAO info
    if (existingDAO) {
      const { error: updateError } = await supabase
        .from('daos')
        .update(daoData)
        .eq('id', daoConfig.id);
        
      if (updateError) {
        console.error(`Error updating DAO ${daoConfig.id}:`, updateError);
        result.failed++;
      } else {
        result.updated++;
      }
    } else {
      const { error: insertError } = await supabase
        .from('daos')
        .insert({
          ...daoData,
          created_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error(`Error inserting DAO ${daoConfig.id}:`, insertError);
        result.failed++;
      } else {
        result.added++;
      }
    }
  } catch (error) {
    console.error(`Error initializing DAO ${daoConfig.id}:`, error);
    result.failed++;
  }
}

/**
 * Initialize all Base ecosystem DAOs
 */
async function initBaseEcosystemDAOs(): Promise<{ 
  added: number;
  updated: number;
  failed: number;
}> {
  const result = { added: 0, updated: 0, failed: 0 };

  try {
    // Process each DAO in parallel
    await Promise.all(
      BASE_ECOSYSTEM_DAOS.map(dao => initDAO(dao, result))
    );

    return result;
  } catch (error) {
    console.error('Error in initBaseEcosystemDAOs:', error);
    return result;
  }
}

// Serve HTTP requests
serve(async (req) => {
  try {
    // Execute the initialization
    const initStart = new Date();
    const result = await initBaseEcosystemDAOs();
    const initEnd = new Date();
    const durationMs = initEnd.getTime() - initStart.getTime();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Base ecosystem DAOs initialized successfully',
      result,
      duration_ms: durationMs,
      initialized_at: initEnd.toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in initialization function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Base ecosystem DAO initialization failed',
      error: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
