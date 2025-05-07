import React from 'react';
import { AIDecisionProvider, useAIDecisionContext } from './AIDecisionProvider';
import { Proposal } from '@/lib/services/proposal.service';

/**
 * This component enhances the proposal detail page with AI decision capabilities
 * without modifying the UI components themselves.
 * 
 * It works by wrapping child components with the AIDecisionProvider context
 * and injecting data through existing props.
 */
interface ProposalDetailWithAIProps {
  proposal: Proposal;
  // Pass through any other props that the original component needs
  [key: string]: any;
}

// The inner component that uses the AI Decision context
function ProposalDetailInner({ proposal, ...props }: ProposalDetailWithAIProps) {
  const {
    loading,
    error,
    getDetailProps,
    getVoteButtonProps,
    castVote,
    recalculate
  } = useAIDecisionContext();
  
  // Handle vote casting
  const handleCastVote = async (choice: string) => {
    try {
      const success = await castVote(choice);
      if (success && props.onVoteCast) {
        props.onVoteCast(choice);
      }
    } catch (err) {
      console.error('Error casting vote:', err);
    }
  };
  
  // Handle recalculation
  const handleRecalculate = async () => {
    try {
      await recalculate();
    } catch (err) {
      console.error('Error recalculating decision:', err);
    }
  };
  
  // If the proposal has aiDecision prop, enhance it with our AI decision data
  // This allows us to inject AI data into the existing UI without modifying it
  const enhancedProps = {
    ...props,
    proposal: {
      ...proposal,
      aiDecision: getDetailProps(),
    },
    // If the component accepts vote handlers, provide them
    onVoteCast: props.onVoteCast || handleCastVote,
    onRecalculateDecision: props.onRecalculateDecision || handleRecalculate,
    // Button props that can be used by child components
    voteButtonProps: getVoteButtonProps(handleCastVote),
    // Pass through loading state
    isAILoading: loading,
  };
  
  // Return the original children with enhanced props
  return (
    <>
      {error && (
        <div className="text-red-500 text-sm mb-2">
          Error loading AI decision: {error}
        </div>
      )}
      {/* The rest of the component renders without modification */}
      {props.children && React.Children.map(props.children, child => {
        // Only enhance React elements
        if (React.isValidElement(child)) {
          return React.cloneElement(child, enhancedProps);
        }
        return child;
      })}
    </>
  );
}

// The outer component that provides the AI Decision context
export function ProposalDetailWithAI(props: ProposalDetailWithAIProps) {
  const { proposal } = props;
  
  return (
    <AIDecisionProvider proposalId={proposal.id}>
      <ProposalDetailInner {...props} />
    </AIDecisionProvider>
  );
}

/**
 * HOC to wrap any proposal detail component with AI decision capabilities
 */
export function withAIDecision<P extends ProposalDetailWithAIProps>(
  Component: React.ComponentType<P>
) {
  return function WithAIDecisionComponent(props: P) {
    return (
      <ProposalDetailWithAI {...props}>
        <Component {...props} />
      </ProposalDetailWithAI>
    );
  };
}
