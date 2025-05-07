// Edge function to sync Snapshot proposals on a schedule
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
}

interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;
  state: string;
  space: {
    id: string;
    name: string;
  };
}

// Environment variables for Supabase connection
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Snapshot API client
class SnapshotClient {
  private static API_URL = 'https://hub.snapshot.org/graphql';

  /**
   * Fetch proposals for a specific space
   */
  static async getProposals(spaceId: string, state: 'active' | 'closed' | 'all' = 'active'): Promise<SnapshotProposal[]> {
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
      return data.data.proposals;
    } catch (error) {
      console.error(`Error fetching Snapshot proposals for ${spaceId}:`, error);
      return [];
    }
  }
}

// Function to extract simple summary from proposal body
function extractSummary(body: string): string {
  if (!body) return '';
  
  // For simplicity, just take the first paragraph or 150 characters
  const firstParagraph = body.split('\n\n')[0] || '';
  return firstParagraph.length > 150 
    ? firstParagraph.substring(0, 147) + '...' 
    : firstParagraph;
}

// Process and save a single Snapshot proposal
async function processProposal(
  proposal: SnapshotProposal, 
  daoId: string,
  result: { added: number, updated: number, failed: number }
): Promise<void> {
  // Convert Snapshot state to our status format
  let status = proposal.state === 'active' ? 'active' : 
               proposal.state === 'closed' ? 'executed' : 'missed';
  
  // Format for our database
  const proposalData = {
    external_id: proposal.id,
    dao_id: daoId,
    title: proposal.title,
    summary: extractSummary(proposal.body),
    description: proposal.body,
    status,
    start_time: new Date(proposal.start * 1000).toISOString(),
    end_time: new Date(proposal.end * 1000).toISOString(),
    voting_type: 'simple majority', // Default for Snapshot
    quorum: 'N/A', // Not always available in Snapshot
    impact: 'medium', // Default, can be analyzed later
    url: `https://snapshot.org/#/${daoId}/proposal/${proposal.id}`,
    raw_data: proposal,
    updated_at: new Date().toISOString()
  };
  
  // Check if proposal already exists
  const { data: existingProposal, error: checkError } = await supabase
    .from('proposals')
    .select('id')
    .eq('external_id', proposal.id)
    .single();
    
  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`Error checking for existing proposal ${proposal.id}:`, checkError);
    result.failed++;
    return;
  }
  
  // Insert or update the proposal
  if (existingProposal) {
    const { error: updateError } = await supabase
      .from('proposals')
      .update(proposalData)
      .eq('id', existingProposal.id);
      
    if (updateError) {
      console.error(`Error updating proposal ${proposal.id}:`, updateError);
      result.failed++;
    } else {
      result.updated++;
    }
  } else {
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        ...proposalData,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (insertError) {
      console.error(`Error inserting proposal ${proposal.id}:`, insertError);
      result.failed++;
    } else {
      result.added++;
      
      // Queue for AI processing if it's a new active proposal
      if (status === 'active') {
        try {
          const { error } = await supabase
            .from('ai_processing_queue')
            .insert({
              proposal_id: newProposal.id,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (error) {
            console.error(`Error queueing proposal ${newProposal.id} for AI processing:`, error);
          }
        } catch (error) {
          console.error(`Error queueing proposal ${newProposal.id} for AI processing:`, error);
        }
      }
    }
  }
}

// Main sync function 
async function syncAllDAOs(): Promise<{ 
  added: number;
  updated: number;
  failed: number;
  daos: string[];
}> {
  const result = { 
    added: 0, 
    updated: 0, 
    failed: 0,
    daos: []
  };

  try {
    // Get all Snapshot DAOs
    const { data: daos, error } = await supabase
      .from('daos')
      .select('id, name')
      .eq('platform', 'Snapshot');

    if (error) {
      console.error('Error fetching DAOs:', error);
      return result;
    }

    if (!daos || daos.length === 0) {
      console.log('No Snapshot DAOs found');
      return result;
    }

    // Process each DAO
    for (const dao of daos) {
      console.log(`Syncing proposals for DAO ${dao.name} (${dao.id})`);
      result.daos.push(dao.id);
      
      // Get active proposals from Snapshot
      const proposals = await SnapshotClient.getProposals(dao.id, 'active');
      
      // Process each proposal
      for (const proposal of proposals) {
        try {
          await processProposal(proposal, dao.id, result);
        } catch (error) {
          console.error(`Error processing proposal ${proposal.id}:`, error);
          result.failed++;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error in syncAllDAOs:', error);
    return result;
  }
}

// Serve HTTP requests
serve(async (req) => {
  // Check for scheduled invocation
  const isScheduled = req.headers.get('x-scheduled') === 'true';
  const isAuthorized = req.headers.get('authorization')?.startsWith('Bearer ');
  
  if (!isScheduled && !isAuthorized) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized',
      message: 'This endpoint requires authentication or scheduled invocation'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Execute the sync operation
    const syncStart = new Date();
    const result = await syncAllDAOs();
    const syncEnd = new Date();
    const durationMs = syncEnd.getTime() - syncStart.getTime();
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Proposal sync completed',
      result,
      duration_ms: durationMs,
      synced_at: syncEnd.toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in sync function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Proposal sync failed',
      error: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
