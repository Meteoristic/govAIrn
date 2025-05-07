# AI Decision Engine

The AI Decision Engine provides intelligent proposal analysis and decision recommendations based on user personas. This document explains how to integrate it with existing frontend components without modifying any UI.

## Architecture

The AI Decision Engine is built using a clean, layered architecture:

1. **Core Services** - Foundation of the AI decision making process
   - `openai.service.ts` - OpenAI API integration
   - `prompt-template.service.ts` - Structured prompts for AI interactions
   - `text-processing.service.ts` - Text analysis utilities
   - `reasoning-pipeline.service.ts` - Multi-step reasoning process
   - `ai-decision.service.ts` - Main decision generation service

2. **Integration Layer** - Connects AI services with UI components
   - `useAIDecisions.ts` - React hook for using AI decisions
   - `ai-decision.factory.ts` - Factory for UI data structures
   - `AIDecisionProvider.tsx` - Context provider for decisions

3. **Database Layer** - Supabase integration
   - `ai_decisions` table - Stores decision outcomes
   - `ai_decision_factors` table - Stores decision factors
   - `ai_processing_queue` table - Manages background processing

## Database Setup

Run the setup script to create necessary tables and functions:

```bash
node scripts/setup-ai-decision-database.js
```

This will:
- Create tables for storing AI decisions and factors
- Set up Row Level Security (RLS) for data protection
- Create triggers for automatic recalculations
- Implement helper functions for efficient operations

## Integration with Existing UI

The AI Decision Engine is designed to work with existing UI components **without modifying their structure or appearance**. There are three ways to integrate:

### 1. Higher-Order Component (HOC)

Wrap your existing components with the `withAIDecision` HOC:

```tsx
import { withAIDecision } from '@/components/proposals/ProposalDetailWithAI';

// Your existing component
function YourProposalDetail(props) {
  // ...existing component code
}

// Enhanced component with AI decisions
export const EnhancedProposalDetail = withAIDecision(YourProposalDetail);
```

### 2. Provider Component

Wrap your component tree with the `AIDecisionProvider`:

```tsx
import { AIDecisionProvider } from '@/components/proposals/AIDecisionProvider';

function YourComponent({ proposal }) {
  return (
    <AIDecisionProvider proposalId={proposal.id}>
      {/* Your existing components */}
      <YourProposalContent />
      <YourVotingButtons />
    </AIDecisionProvider>
  );
}
```

### 3. React Hook

Use the `useAIDecisions` hook directly in your components:

```tsx
import { useAIDecisions } from '@/lib/hooks/useAIDecisions';

function YourComponent({ proposalId }) {
  const { 
    decision, 
    loading, 
    error,
    castVoteFromDecision
  } = useAIDecisions(proposalId);
  
  // Use the decision data in your component
  return (
    <div>
      {loading ? (
        <p>Loading decision...</p>
      ) : (
        <>
          <h3>AI Recommendation: {decision?.decision}</h3>
          <button onClick={() => castVoteFromDecision()}>
            Vote {decision?.decision}
          </button>
        </>
      )}
    </div>
  );
}
```

## Example Usage

See `src/components/proposals/IntegrationExample.tsx` for a complete example of integrating the AI Decision Engine with existing UI components.

## Data Flow

1. User views a proposal
2. AI Decision Engine checks for an existing decision
3. If none exists or recalculation is needed, it generates a new decision
4. Decision data is injected into existing components via props
5. UI displays the decision without structural changes

## Testing

Use the test script to verify AI Decision Engine functionality:

```bash
node scripts/test-ai-decisions.js
```

This tests:
- OpenAI API connectivity
- Proposal analysis
- Decision generation with factors
- Confidence scoring

## Configuration

The engine uses GPT-4o-mini by default, which balances cost and quality. You can modify `src/lib/services/openai.service.ts` to use other models:

- GPT-4o - Higher quality but more expensive
- GPT-3.5 Turbo - Lower quality but much cheaper

Set your OpenAI API key in the `.env` file:

```
VITE_OPENAI_API_KEY=your-api-key-here
```

## Cost Considerations

The AI Decision Engine is designed to minimize API calls:
- Decisions are cached and reused unless recalculation is needed
- Recalculation only happens when persona values change
- Efficient prompt design reduces token usage

## Troubleshooting

If you encounter issues with the AI Decision Engine:

1. Check browser console for errors
2. Verify OpenAI API key is valid
3. Check Supabase database tables are properly created
4. Ensure user has a valid persona created
