import React, { createContext, useContext, ReactNode } from 'react';
import { useAIDecisions } from '@/lib/hooks/useAIDecisions';
import { AIDecisionFactory } from '@/lib/factories/ai-decision.factory';
import { AIDecision } from '@/lib/services/proposal.service';

// Context interface
interface AIDecisionContextType {
  decision: AIDecision | null;
  loading: boolean;
  error: string | null;
  castVote: (choice?: string) => Promise<boolean>;
  recalculate: () => Promise<boolean>;
  getDetailProps: () => any;
  getCardProps: () => any;
  getFactorsProps: () => any;
  getReasoningProps: () => any;
  getVoteButtonProps: (onCastVote: (choice: string) => Promise<void>) => any;
}

// Create context
const AIDecisionContext = createContext<AIDecisionContextType | undefined>(undefined);

// Provider props
interface AIDecisionProviderProps {
  proposalId: string;
  children: ReactNode;
}

/**
 * Provider component that makes AI decision data available to any child component
 * This allows UI components to access decision data without modifying their structure
 */
export function AIDecisionProvider({ proposalId, children }: AIDecisionProviderProps) {
  const {
    decision,
    loading,
    error,
    castVoteFromDecision,
    recalculateDecision
  } = useAIDecisions(proposalId);
  
  // Factory methods for UI component props
  const getDetailProps = () => 
    AIDecisionFactory.toProposalDetailDecisionProps(decision, loading);
  
  const getCardProps = () => 
    AIDecisionFactory.toProposalCardDecisionProps(decision, loading);
  
  const getFactorsProps = () => 
    AIDecisionFactory.toFactorsVisualizationProps(decision, loading);
  
  const getReasoningProps = () => 
    AIDecisionFactory.toReasoningDisplayProps(decision, loading);
  
  const getVoteButtonProps = (onCastVote: (choice: string) => Promise<void>) => 
    AIDecisionFactory.toVoteButtonProps(decision, onCastVote, loading);
  
  // Context value
  const value: AIDecisionContextType = {
    decision,
    loading,
    error,
    castVote: castVoteFromDecision,
    recalculate: recalculateDecision,
    getDetailProps,
    getCardProps,
    getFactorsProps,
    getReasoningProps,
    getVoteButtonProps
  };
  
  return (
    <AIDecisionContext.Provider value={value}>
      {children}
    </AIDecisionContext.Provider>
  );
}

/**
 * Hook to use the AI decision context
 */
export function useAIDecisionContext() {
  const context = useContext(AIDecisionContext);
  if (context === undefined) {
    throw new Error('useAIDecisionContext must be used within an AIDecisionProvider');
  }
  return context;
}

/**
 * Higher-order component to wrap any existing component with AI decision capabilities
 * This allows us to enhance components without modifying them
 */
export function withAIDecision<P extends object>(Component: React.ComponentType<P>) {
  return function WithAIDecisionComponent(props: P & { proposalId: string }) {
    const { proposalId, ...rest } = props;
    
    return (
      <AIDecisionProvider proposalId={proposalId}>
        <Component {...rest as P} />
      </AIDecisionProvider>
    );
  };
}
