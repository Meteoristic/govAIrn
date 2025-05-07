import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AIDecisionService } from '@/lib/services/ai-decision.service';
import { PersonaService } from '@/lib/services/persona.service';
import { ProposalService } from '@/lib/services/proposal.service';
import { AIDecision } from '@/lib/services/proposal.service';

/**
 * Hook for working with AI decisions in React components
 * Provides a simple interface for components to interact with the AI decision engine
 * without requiring UI modifications
 */
export function useAIDecisions(proposalId: string) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<AIDecision | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  
  // Get active persona
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchPersona = async () => {
      try {
        const activePersona = await PersonaService.getActivePersona(user.id);
        if (activePersona) {
          setPersonaId(activePersona.id);
        } else {
          setError('No active persona found. Please create a persona first.');
        }
      } catch (err) {
        console.error('Error fetching active persona:', err);
        setError('Failed to fetch active persona.');
      }
    };
    
    fetchPersona();
  }, [user?.id]);
  
  // Get or generate AI decision when proposalId and personaId are available
  useEffect(() => {
    if (!user?.id || !proposalId || !personaId) return;
    
    const fetchDecision = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const aiDecision = await AIDecisionService.getOrGenerateDecision(
          user.id,
          proposalId,
          personaId
        );
        
        setDecision(aiDecision);
      } catch (err) {
        console.error('Error fetching AI decision:', err);
        setError('Failed to fetch AI decision.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDecision();
  }, [user?.id, proposalId, personaId]);
  
  // Function to cast a vote based on AI decision
  const castVoteFromDecision = async (overrideChoice?: string) => {
    if (!user?.id || !proposalId || !decision) {
      setError('Cannot cast vote: Missing required information.');
      return false;
    }
    
    try {
      setLoading(true);
      
      // Determine vote choice (use override if provided, otherwise use AI decision)
      const voteChoice = overrideChoice || 
        AIDecisionService.decisionToVoteChoice(decision.decision);
      
      // Cast the vote
      await ProposalService.castVote(
        user.id,
        proposalId,
        voteChoice,
        !overrideChoice, // isAIDecided = true if no override
        !!overrideChoice  // isManualOverride = true if override provided
      );
      
      return true;
    } catch (err) {
      console.error('Error casting vote:', err);
      setError('Failed to cast vote.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Function to request recalculation of the AI decision
  const recalculateDecision = async () => {
    if (!user?.id || !proposalId) {
      setError('Cannot recalculate: Missing required information.');
      return false;
    }
    
    try {
      setLoading(true);
      
      await ProposalService.recalculateAIDecision(user.id, proposalId);
      
      // Fetch the new decision
      if (personaId) {
        const updatedDecision = await AIDecisionService.generateDecision(
          user.id,
          proposalId,
          personaId
        );
        
        setDecision(updatedDecision);
      }
      
      return true;
    } catch (err) {
      console.error('Error recalculating decision:', err);
      setError('Failed to recalculate decision.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    decision,
    loading,
    error,
    castVoteFromDecision,
    recalculateDecision
  };
}
