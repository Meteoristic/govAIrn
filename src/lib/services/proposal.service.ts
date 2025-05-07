import { supabase } from '@/lib/supabase';
import { SnapshotService, SnapshotProposal } from './snapshot.service';
import { MarkdownParser } from '../utils/markdownParser';

export interface ProposalDetails {
  id: string;
  proposal_id: string;
  pros?: string[];
  cons?: string[];
  analyzed_text?: string;
}

export interface Proposal {
  id: string;
  external_id: string;
  dao_id: string;
  title: string;
  summary?: string;
  description?: string;
  status: string;
  start_time?: string;
  end_time?: string;
  voting_type?: string;
  quorum?: string;
  impact?: string;
  url?: string;
  created_at: string;
  updated_at: string;
  raw_data?: any;
  proposal_details?: ProposalDetails;
  daos?: any;
}

export interface Vote {
  id: string;
  user_id: string;
  proposal_id: string;
  vote_choice: string;
  vote_weight?: number;
  executed: boolean;
  transaction_hash?: string;
  voted_at: string;
  created_at: string;
  updated_at: string;
  is_ai_decided: boolean;
  is_manual_override: boolean;
  proposals?: Proposal;
}

export interface AIDecisionFactor {
  id: string;
  ai_decision_id: string;
  factor_name: string;
  factor_value: number;
  factor_weight: number;
  explanation: string;
  created_at: string;
}

export interface AIDecision {
  id: string;
  user_id: string;
  proposal_id: string;
  persona_id: string;
  decision: string;
  confidence: number;
  persona_match: number;
  reasoning: string;
  chain_of_thought: string;
  created_at: string;
  requires_recalculation: boolean;
  factors?: AIDecisionFactor[];
}

export class ProposalService {
  /**
   * Get all proposals with optional filtering
   */
  static async getProposals(options?: { 
    daoId?: string; 
    status?: string; 
    limit?: number;
  }): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*, proposal_details(*)')
      .order('created_at', { ascending: false });
    
    if (options?.daoId) {
      query = query.eq('dao_id', options.daoId);
    }
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching proposals:', error);
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Get a single proposal by ID
   */
  static async getProposalById(proposalId: string): Promise<Proposal | null> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, proposal_details(*)')
      .eq('id', proposalId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Proposal not found
      }
      console.error('Error fetching proposal:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Get user's votes
   */
  static async getUserVotes(userId: string): Promise<Vote[]> {
    const { data, error } = await supabase
      .from('votes')
      .select('*, proposals(*)')
      .eq('user_id', userId)
      .order('voted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user votes:', error);
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Get user's vote for a specific proposal
   */
  static async getUserVoteForProposal(userId: string, proposalId: string): Promise<Vote | null> {
    const { data, error } = await supabase
      .from('votes')
      .select('*, proposals(*)')
      .eq('user_id', userId)
      .eq('proposal_id', proposalId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Vote not found
      }
      console.error('Error fetching user vote:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Cast a vote
   */
  static async castVote(
    userId: string, 
    proposalId: string, 
    voteChoice: string, 
    isAIDecided: boolean = false, 
    isManualOverride: boolean = true
  ): Promise<Vote> {
    // Check if vote already exists
    const existing = await this.getUserVoteForProposal(userId, proposalId);
    
    if (existing) {
      // Update existing vote
      const { data, error } = await supabase
        .from('votes')
        .update({ 
          vote_choice: voteChoice,
          is_ai_decided: isAIDecided,
          is_manual_override: isManualOverride,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*, proposals(*)')
        .single();
      
      if (error) {
        console.error('Error updating vote:', error);
        throw error;
      }
      
      return data;
    } else {
      // Create new vote
      const { data, error } = await supabase
        .from('votes')
        .insert({ 
          user_id: userId,
          proposal_id: proposalId,
          vote_choice: voteChoice,
          is_ai_decided: isAIDecided,
          is_manual_override: isManualOverride,
          voted_at: new Date().toISOString()
        })
        .select('*, proposals(*)')
        .single();
      
      if (error) {
        console.error('Error creating vote:', error);
        throw error;
      }
      
      return data;
    }
  }
  
  /**
   * Get AI decision for a proposal
   */
  static async getAIDecision(userId: string, proposalId: string, personaId: string): Promise<AIDecision | null> {
    const { data, error } = await supabase
      .from('ai_decisions')
      .select('*, factors:decision_factors(*)')
      .eq('user_id', userId)
      .eq('proposal_id', proposalId)
      .eq('persona_id', personaId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Decision not found, attempt to generate one via the AI decisions edge function
        try {
          // Get the access token from current session
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token || '';
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL || 'https://ebchyxgtnyhvvwhzsmrx.supabase.co'}/functions/v1/ai-decisions/proposals/${proposalId}/analyze`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`AI decision generation failed: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (err) {
          console.error('Error generating AI decision:', err);
          return null;
        }
      }
      
      console.error('Error fetching AI decision:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Request recalculation of AI decision
   */
  static async recalculateAIDecision(userId: string, proposalId: string): Promise<boolean> {
    try {
      // Get the access token from current session
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://ebchyxgtnyhvvwhzsmrx.supabase.co'}/functions/v1/ai-decisions/proposals/${proposalId}/recalculate`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`AI decision recalculation failed: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error('Error recalculating AI decision:', err);
      return false;
    }
  }

  /**
   * Synchronize proposals for a DAO from Snapshot using an edge function
   * This bypasses RLS restrictions and ensures data is properly synced
   */
  static async syncProposalsFromSnapshot(
    daoId: string, 
    state: 'active' | 'closed' | 'all' = 'active'
  ): Promise<{ added: number, updated: number, failed: number }> {
    try {
      console.log(`Syncing ${state} proposals for DAO ${daoId} using edge function...`);
      
      // Use the Supabase URL from our config
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebchyxgtnyhvvwhzsmrx.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViY2h5eGd0bnlodnZ3aHpzbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTIxMjMsImV4cCI6MjA2MTg4ODEyM30.k9PZ2qdqmBkTPX7Bl8tT986KoJeVxVwzMeLepSDVe8Y';
      const functionUrl = `${supabaseUrl}/functions/v1/sync-dao-proposals`;
      
      // Call the edge function to sync the proposals
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ daoId, state })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error syncing proposals from edge function (${response.status}):`, errorText);
        return { added: 0, updated: 0, failed: 0 };
      }
      
      const result = await response.json();
      console.log(`Sync completed for ${daoId}. Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`);
      
      return {
        added: result.added || 0,
        updated: result.updated || 0,
        failed: result.failed || 0
      };
    } catch (error) {
      console.error(`Error syncing proposals for DAO ${daoId}:`, error);
      return { added: 0, updated: 0, failed: 0 };
    }
  }

  /**
   * Process a single Snapshot proposal and save to database
   */
  private static async processSnapshotProposal(
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
      summary: this.extractSummary(proposal.body),
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
        
        // Also update proposal_details if needed
        await this.generateProposalDetails(existingProposal.id, proposal.body);
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
        
        // Generate and save proposal details
        await this.generateProposalDetails(newProposal.id, proposal.body);
        
        // Queue for AI processing if it's a new active proposal
        if (status === 'active') {
          await this.queueForAIProcessing(newProposal.id);
        }
      }
    }
  }
  
  /**
   * Extract a brief summary from the proposal body
   */
  private static extractSummary(body: string): string {
    if (!body) return '';
    
    // For simplicity, just take the first paragraph or 150 characters
    const firstParagraph = body.split('\n\n')[0] || '';
    return firstParagraph.length > 150 
      ? firstParagraph.substring(0, 147) + '...' 
      : firstParagraph;
  }
  
  /**
   * Generate proposal details (pros, cons, analyzed text) from the proposal body
   */
  private static async generateProposalDetails(proposalId: string, body: string): Promise<void> {
    if (!body) return;

    try {
      // Extract pros and cons from the proposal body (simple heuristic)
      const prosRegex = /(?:pros|benefits|advantages)(?:\s*:|\s*\n)([\s\S]*?)(?=(?:cons|drawbacks|disadvantages)|$)/i;
      const consRegex = /(?:cons|drawbacks|disadvantages)(?:\s*:|\s*\n)([\s\S]*?)(?=(?:pros|benefits|advantages)|$)/i;
      
      const prosMatch = body.match(prosRegex);
      const consMatch = body.match(consRegex);
      
      const pros = prosMatch ? MarkdownParser.extractBulletPoints(prosMatch[1]) : [];
      const cons = consMatch ? MarkdownParser.extractBulletPoints(consMatch[1]) : [];
      
      // Check if details already exist
      const { data: existingDetails, error: checkError } = await supabase
        .from('proposal_details')
        .select('id')
        .eq('proposal_id', proposalId)
        .single();
        
      const detailsData = {
        proposal_id: proposalId,
        pros,
        cons,
        analyzed_text: MarkdownParser.extractPlainText(body),
        updated_at: new Date().toISOString()
      };
      
      if (existingDetails) {
        // Update existing details
        const { error: updateError } = await supabase
          .from('proposal_details')
          .update(detailsData)
          .eq('id', existingDetails.id);
          
        if (updateError) {
          console.error(`Error updating proposal details for ${proposalId}:`, updateError);
        }
      } else {
        // Insert new details
        const { error: insertError } = await supabase
          .from('proposal_details')
          .insert({
            ...detailsData,
            created_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error(`Error inserting proposal details for ${proposalId}:`, insertError);
        }
      }
    } catch (error) {
      console.error(`Error generating proposal details for ${proposalId}:`, error);
    }
  }
  
  /**
   * Queue a proposal for AI processing
   */
  private static async queueForAIProcessing(proposalId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_processing_queue')
        .insert({
          proposal_id: proposalId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error(`Error queueing proposal ${proposalId} for AI processing:`, error);
      }
    } catch (error) {
      console.error(`Error queueing proposal ${proposalId} for AI processing:`, error);
    }
  }
  
  /**
   * List proposals with extended filtering options
   */
  static async listProposals({
    daoId,
    status,
    limit = 20
  }: {
    daoId?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<Proposal[]> {
    try {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          daos (*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (daoId) {
        query = query.eq('dao_id', daoId);
      }

      // Only filter by status if it's provided
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error listing proposals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in listProposals:', error);
      return [];
    }
  }
}
