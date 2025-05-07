import { PersonaValues } from '@/types/persona';

/**
 * PromptTemplateService manages the templates used for interaction with LLMs
 * This provides a central place to manage prompts and ensures consistency
 */
export class PromptTemplateService {
  /**
   * Get the system prompt for proposal analysis based on persona values
   */
  static getProposalAnalysisSystemPrompt(persona: PersonaValues): string {
    return `You are GovAIrn, an AI governance advisor for DAOs and web3 communities. Your task is to analyze proposals and provide insights based on the user's governance persona.

USER'S GOVERNANCE PERSONA PREFERENCES (Scale 0-100):
- Risk Tolerance: ${persona.risk}/100 (Higher = more risk accepting)
- ESG Focus: ${persona.esg}/100 (Higher = more focus on environmental, social, governance)
- Treasury Conservation: ${persona.treasury}/100 (Higher = more conservative with treasury)
- Time Horizon: ${persona.horizon}/100 (Higher = longer-term outlook)
- Participation Frequency: ${persona.frequency}/100 (Higher = more frequent participation)

Analyze the proposal thoroughly and consider:
1. Risks and benefits
2. Financial implications for the DAO
3. Alignment with ESG principles
4. Long-term vs. short-term tradeoffs
5. Potential impact on the DAO's governance

Be objective and data-driven in your analysis. Always consider multiple perspectives.`;
  }
  
  /**
   * Get the system prompt for generating a decision based on proposal analysis and persona values
   */
  static getDecisionSystemPrompt(persona: PersonaValues): string {
    return `You are GovAIrn, an AI governance advisor making a decision recommendation based on proposal analysis. Your task is to recommend FOR or AGAINST a proposal based on the user's persona values and the analysis of the proposal.

USER'S GOVERNANCE PERSONA PREFERENCES (Scale 0-100):
- Risk Tolerance: ${persona.risk}/100 (Higher = more risk accepting)
- ESG Focus: ${persona.esg}/100 (Higher = more focus on environmental, social, governance)
- Treasury Conservation: ${persona.treasury}/100 (Higher = more conservative with treasury)
- Time Horizon: ${persona.horizon}/100 (Higher = longer-term outlook)
- Participation Frequency: ${persona.frequency}/100 (Higher = more frequent participation)

Your response must be a structured JSON object with the following format:
{
  "decision": "FOR" or "AGAINST",
  "confidence": number (0-100),
  "reasoning": "Brief explanation for your decision",
  "factors": [
    {
      "name": "Factor name (e.g., Risk, Treasury Impact, ESG Alignment)",
      "value": number (-100 to 100, negative = against, positive = for),
      "weight": number (0-100, indicates importance to decision),
      "explanation": "Brief explanation of this factor's analysis"
    },
    ...more factors
  ],
  "chainOfThought": "Your detailed reasoning process"
}`;
  }
  
  /**
   * Get user prompt for proposal analysis
   */
  static getProposalAnalysisUserPrompt(proposal: {
    title: string;
    description?: string;
    status?: string;
  }): string {
    return `Please analyze this DAO proposal:

TITLE: ${proposal.title}

DESCRIPTION:
${proposal.description || 'No description provided.'}

${proposal.status ? `STATUS: ${proposal.status}` : ''}

Provide a thorough analysis considering my persona preferences.`;
  }
  
  /**
   * Get user prompt for decision generation
   */
  static getDecisionUserPrompt(
    proposal: { title: string; description?: string },
    analysis: string
  ): string {
    return `Make a decision recommendation for this proposal:

TITLE: ${proposal.title}

ANALYSIS:
${analysis}

Generate a decision recommendation that respects my persona preferences.`;
  }
  
  /**
   * Get prompt for estimating persona match score (0-100)
   */
  static getPersonaMatchPrompt(
    persona: PersonaValues,
    proposal: { title: string; description?: string },
    decision: { decision: string; reasoning: string }
  ): string {
    return `You are GovAIrn, an AI governance advisor. Calculate a "persona match score" between 0-100 that indicates how well the decision matches the user's persona values.

USER'S GOVERNANCE PERSONA:
- Risk Tolerance: ${persona.risk}/100
- ESG Focus: ${persona.esg}/100
- Treasury Conservation: ${persona.treasury}/100
- Time Horizon: ${persona.horizon}/100
- Participation Frequency: ${persona.frequency}/100

PROPOSAL:
Title: ${proposal.title}
${proposal.description ? `Description: ${proposal.description?.substring(0, 200)}...` : ''}

DECISION:
Vote: ${decision.decision}
Reasoning: ${decision.reasoning}

Calculate a score from 0-100 where:
- 0 means the decision completely contradicts the user's persona values
- 100 means the decision perfectly aligns with the user's persona values

Respond with just a number between 0 and 100.`;
  }
}
