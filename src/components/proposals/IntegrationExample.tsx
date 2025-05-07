import React from 'react';
import { ProposalDetailWithAI } from './ProposalDetailWithAI';
import { useAIDecisionContext } from './AIDecisionProvider';

/**
 * This is an example component that shows how to integrate the AI Decision Engine
 * with existing UI components without modifying them.
 * 
 * It demonstrates how to preserve the UI layout and styling while enhancing
 * the component with AI-powered decision capabilities.
 */

// Example usage in a parent component
export function ProposalPageExample({ proposalId }: { proposalId: string }) {
  // Fetch proposal data from your existing service
  const [proposal, setProposal] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Your existing data fetching logic
    const fetchProposal = async () => {
      try {
        // Replace with your actual data fetching
        const response = await fetch(`/api/proposals/${proposalId}`);
        const data = await response.json();
        setProposal(data);
      } catch (error) {
        console.error('Error fetching proposal:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposal();
  }, [proposalId]);
  
  if (loading) {
    return <div>Loading proposal...</div>;
  }
  
  if (!proposal) {
    return <div>Proposal not found</div>;
  }
  
  return (
    <div>
      {/* Wrap your existing UI components with ProposalDetailWithAI */}
      <ProposalDetailWithAI 
        proposal={proposal}
        // Pass through any other props your component needs
        onVoteCast={(choice) => console.log(`Vote cast: ${choice}`)}
      >
        {/* Your existing UI components remain unchanged */}
        <YourExistingProposalDetailComponent />
      </ProposalDetailWithAI>
    </div>
  );
}

// This is a stand-in for your existing UI component - DO NOT MODIFY THIS
function YourExistingProposalDetailComponent() {
  // Use the AI decision context to access decision data
  const { 
    getDetailProps, 
    getFactorsProps,
    getVoteButtonProps
  } = useAIDecisionContext();
  
  // Get props formatted for your existing UI components
  const aiDecisionProps = getDetailProps();
  const factorsProps = getFactorsProps();
  
  // Handle vote casting
  const handleVote = async (choice: string) => {
    console.log(`Casting vote: ${choice}`);
    // Implementation here
  };
  
  // Get vote button props
  const voteButtonProps = getVoteButtonProps(handleVote);
  
  // Your component renders exactly as before, but with AI-enhanced data
  return (
    <div className="proposal-detail">
      <h1>Proposal Detail</h1>
      
      {/* The existing UI is preserved exactly as-is */}
      <div className="proposal-content">
        {/* Content remains unchanged */}
      </div>
      
      {/* AI decision information */}
      <div className="ai-decision-section">
        {aiDecisionProps.loading ? (
          <div>Loading AI decision...</div>
        ) : (
          <>
            <h3>AI Recommendation: {aiDecisionProps.decision}</h3>
            <div>Confidence: {aiDecisionProps.confidence}%</div>
            <div>Reasoning: {aiDecisionProps.reasoning}</div>
            
            {/* Factors visualization */}
            <div className="factors-section">
              <h4>Decision Factors</h4>
              {factorsProps.factors.map((factor, index) => (
                <div key={index} className="factor-item">
                  <span>{factor.name} ({factor.value})</span>
                  <div>{factor.explanation}</div>
                </div>
              ))}
            </div>
            
            {/* Vote button */}
            <button
              disabled={voteButtonProps.disabled}
              onClick={() => voteButtonProps.onClick()}
              className="vote-button"
            >
              Vote {voteButtonProps.voteChoice}
              {voteButtonProps.loading && " (Loading...)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Alternative: Use HOC instead of wrapper component
export const EnhancedProposalDetail = withAIDecision(YourExistingProposalDetailComponent);

// Example usage with HOC
function ProposalPageWithHOC({ proposalId, proposal }: { proposalId: string, proposal: any }) {
  return <EnhancedProposalDetail proposal={proposal} />;
}

// This function creates a higher-order component for any component
function withAIDecision<P extends { proposal: any }>(Component: React.ComponentType<P>) {
  return function WithAIDecisionComponent(props: P) {
    return (
      <ProposalDetailWithAI proposal={props.proposal}>
        <Component {...props} />
      </ProposalDetailWithAI>
    );
  };
}
