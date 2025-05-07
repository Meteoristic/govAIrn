import { AIDecision } from '@/lib/services/proposal.service';

/**
 * Factory for creating data structures needed by UI components
 * This allows us to adapt AI decision data to work with existing UI
 * without modifying the UI components themselves
 */
export class AIDecisionFactory {
  /**
   * Convert an AI decision to the format expected by ProposalDetailDecision component
   */
  static toProposalDetailDecisionProps(decision: AIDecision | null, isLoading: boolean = false) {
    if (isLoading) {
      return {
        loading: true,
        decision: null,
        confidence: 0,
        factors: [],
        reasoning: '',
        personaMatch: 0
      };
    }
    
    if (!decision) {
      return {
        loading: false,
        decision: null,
        confidence: 0,
        factors: [],
        reasoning: 'No decision available. Please try again later.',
        personaMatch: 0
      };
    }
    
    return {
      loading: false,
      decision: decision.decision,
      confidence: decision.confidence,
      factors: decision.factors?.map(factor => ({
        name: factor.factor_name,
        value: factor.factor_value,
        weight: factor.factor_weight,
        explanation: factor.explanation
      })) || [],
      reasoning: decision.reasoning,
      personaMatch: decision.persona_match
    };
  }
  
  /**
   * Convert an AI decision to the format expected by ProposalCardDecision component
   */
  static toProposalCardDecisionProps(decision: AIDecision | null, isLoading: boolean = false) {
    if (isLoading) {
      return {
        loading: true,
        decision: null,
        confidence: 0,
        personaMatch: 0
      };
    }
    
    if (!decision) {
      return {
        loading: false,
        decision: null,
        confidence: 0,
        personaMatch: 0
      };
    }
    
    return {
      loading: false,
      decision: decision.decision,
      confidence: decision.confidence,
      personaMatch: decision.persona_match
    };
  }
  
  /**
   * Create vote button props based on AI decision
   */
  static toVoteButtonProps(
    decision: AIDecision | null, 
    onCastVote: (choice: string) => Promise<void>,
    isLoading: boolean = false
  ) {
    if (isLoading || !decision) {
      return {
        disabled: true,
        loading: isLoading,
        voteChoice: '',
        onClick: () => {},
        confidence: 0
      };
    }
    
    return {
      disabled: false,
      loading: false,
      voteChoice: decision.decision,
      onClick: () => onCastVote(decision.decision),
      confidence: decision.confidence
    };
  }
  
  /**
   * Create factors visualization props for displaying decision factors in UI
   */
  static toFactorsVisualizationProps(decision: AIDecision | null, isLoading: boolean = false) {
    if (isLoading) {
      return {
        loading: true,
        factors: []
      };
    }
    
    if (!decision || !decision.factors || decision.factors.length === 0) {
      return {
        loading: false,
        factors: []
      };
    }
    
    return {
      loading: false,
      factors: decision.factors.map(factor => ({
        name: factor.factor_name,
        value: factor.factor_value,
        weight: factor.factor_weight,
        explanation: factor.explanation
      }))
    };
  }
  
  /**
   * Create reasoning display props based on AI decision
   */
  static toReasoningDisplayProps(decision: AIDecision | null, isLoading: boolean = false) {
    if (isLoading) {
      return {
        loading: true,
        reasoning: '',
        chainOfThought: ''
      };
    }
    
    if (!decision) {
      return {
        loading: false,
        reasoning: 'No decision reasoning available.',
        chainOfThought: ''
      };
    }
    
    return {
      loading: false,
      reasoning: decision.reasoning,
      chainOfThought: decision.chain_of_thought || ''
    };
  }
}
