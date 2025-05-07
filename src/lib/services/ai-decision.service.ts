import { supabase } from '@/lib/supabase';
import { PromptTemplateService } from './prompt-template.service';
import { PersonaService, Persona } from './persona.service';
import { ProposalService, AIDecision, AIDecisionFactor } from './proposal.service';
import { ReasoningPipelineService } from './reasoning-pipeline.service';

/**
 * DEPRECATED - This service no longer makes any OpenAI API calls.
 * All AI-generated content is now handled exclusively by the ProposalFeed component
 * when a user clicks the "Load Live Data" button.
 */
export class AIDecisionService {
  /**
   * This method no longer makes any API calls. For real AI decisions,
   * use the ProposalFeed component's generateAIDecision function.
   */
  static async generateDecision(
    userId: string,
    proposalId: string,
    personaId: string
  ): Promise<AIDecision> {
    console.log('WARNING: AIDecisionService is deprecated - No API calls are being made');
    
    try {
      // 1. Fetch the proposal and persona data
      const [proposal, persona] = await Promise.all([
        ProposalService.getProposalById(proposalId),
        PersonaService.getPersonaById(personaId)
      ]);
      
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }
      
      if (!persona) {
        throw new Error(`Persona ${personaId} not found`);
      }

      // Create a placeholder decision without making any API calls
      const timestamp = new Date().toISOString();
      
      // Check if a decision already exists
      const { data: existingDecision } = await supabase
        .from('ai_decisions')
        .select('id')
        .eq('user_id', userId)
        .eq('proposal_id', proposalId)
        .eq('persona_id', personaId)
        .maybeSingle();
      
      let aiDecision: AIDecision;
      
      if (existingDecision) {
        // Update existing decision with placeholder
        const { data, error } = await supabase
          .from('ai_decisions')
          .update({
            decision: 'neutral',
            confidence: 0,
            persona_match: 0,
            reasoning: 'This service is deprecated. Real AI decisions are only generated through ProposalFeed when explicitly requested.',
            chain_of_thought: 'This is a placeholder. No OpenAI API calls were made.',
            requires_recalculation: true,
            updated_at: timestamp
          })
          .eq('id', existingDecision.id)
          .select('*')
          .single();
          
        if (error) {
          console.error('Error updating AI decision:', error);
          throw error;
        }
        
        aiDecision = data;
        
        // Delete existing factors
        await supabase
          .from('ai_decision_factors')
          .delete()
          .eq('ai_decision_id', existingDecision.id);
      } else {
        // Create new placeholder decision
        const { data, error } = await supabase
          .from('ai_decisions')
          .insert({
            user_id: userId,
            proposal_id: proposalId,
            persona_id: personaId,
            decision: 'neutral',
            confidence: 0,
            persona_match: 0,
            reasoning: 'This service is deprecated. Real AI decisions are only generated through ProposalFeed when explicitly requested.',
            chain_of_thought: 'This is a placeholder. No OpenAI API calls were made.',
            requires_recalculation: true,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select('*')
          .single();
          
        if (error) {
          console.error('Error creating AI decision:', error);
          throw error;
        }
        
        aiDecision = data;
      }
      
      // Add a single placeholder factor
      const { data: factorData, error: factorError } = await supabase
        .from('ai_decision_factors')
        .insert({
          ai_decision_id: aiDecision.id,
          factor_name: 'Placeholder Factor',
          factor_value: 0,
          factor_weight: 0,
          explanation: 'This is a placeholder. No analysis was performed.',
          created_at: timestamp
        })
        .select('*')
        .single();
        
      if (factorError) {
        console.error('Error creating decision factor:', factorError);
      }
        
      const factors = factorData ? [factorData] : [];
      
      return {
        ...aiDecision,
        factors
      };
    } catch (error) {
      console.error('Error in AI decision generation:', error);
      
      // Create a fallback decision with error information
      return {
        id: 'error',
        user_id: userId,
        proposal_id: proposalId,
        persona_id: personaId,
        decision: 'UNDECIDED',
        confidence: 0,
        persona_match: 0,
        reasoning: 'An error occurred during decision generation. Please try again later.',
        chain_of_thought: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        created_at: new Date().toISOString(),
        requires_recalculation: true,
        factors: []
      };
    }
  }
  
  /**
   * Get or generate an AI decision for a proposal
   * This method no longer generates real AI decisions
   */
  static async getOrGenerateDecision(
    userId: string,
    proposalId: string,
    personaId: string
  ): Promise<AIDecision> {
    console.log('WARNING: AIDecisionService is deprecated - No API calls are being made');
    
    try {
      // Check if decision already exists
      const existingDecision = await ProposalService.getAIDecision(userId, proposalId, personaId);
      
      // If decision exists, return it
      if (existingDecision) {
        return existingDecision;
      }
      
      // Otherwise, generate a placeholder decision
      return this.generateDecision(userId, proposalId, personaId);
    } catch (error) {
      console.error('Error in getOrGenerateDecision:', error);
      throw error;
    }
  }
  
  /**
   * Mark all decisions for a user's proposals as requiring recalculation
   */
  static async requireRecalculationForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_decisions')
      .update({ requires_recalculation: true })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error marking decisions for recalculation:', error);
      throw error;
    }
  }
  
  /**
   * Convert an AI decision to a vote choice compatible with the proposal
   */
  static decisionToVoteChoice(decision: string, votingChoices?: string[]): string {
    // Default vote choices if not provided
    const choices = votingChoices || ['For', 'Against', 'Abstain'];
    
    // Normalize decision and choices for comparison
    const normalizedDecision = decision.trim().toLowerCase();
    
    // Look for appropriate choices based on decision
    if (normalizedDecision === 'for' || normalizedDecision === 'yes') {
      // Find affirmative options
      const forOptions = choices.filter(c => 
        ['for', 'yes', 'approve', 'support'].includes(c.toLowerCase())
      );
      return forOptions.length > 0 ? forOptions[0] : choices[0];
    }
    
    if (normalizedDecision === 'against' || normalizedDecision === 'no') {
      // Find negative options
      const againstOptions = choices.filter(c => 
        ['against', 'no', 'reject', 'oppose'].includes(c.toLowerCase())
      );
      return againstOptions.length > 0 ? againstOptions[0] : choices[1] || choices[0];
    }
    
    // Default to abstain if available, otherwise first choice
    const abstainOptions = choices.filter(c => 
      ['abstain', 'neutral', 'pass'].includes(c.toLowerCase())
    );
    return abstainOptions.length > 0 ? abstainOptions[0] : choices[0];
  }
}
