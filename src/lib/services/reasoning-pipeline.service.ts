import { TextProcessingService } from './text-processing.service';
import { PersonaValues } from '@/types/persona';

/**
 * Type definitions for the reasoning pipeline
 */
export interface ProposalContext {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  status?: string;
  dao?: {
    id: string;
    name: string;
  };
}

export interface ReasoningStep {
  name: string;
  result: string;
  confidence: number;
}

export interface ReasoningResult {
  steps: ReasoningStep[];
  decision: string;
  confidence: number;
  reasoning: string;
  chainOfThought: string;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    explanation: string;
  }>;
}

/**
 * DEPRECATED - This service no longer makes any OpenAI API calls.
 * All AI-generated content is now handled exclusively by the ProposalFeed component
 * when a user clicks the "Load Live Data" button.
 */
export class ReasoningPipelineService {
  /**
   * This method returns a placeholder result without making any API calls.
   * For actual AI-generated content, use the ProposalFeed component.
   */
  static async executeReasoningPipeline(
    proposal: ProposalContext,
    persona: PersonaValues
  ): Promise<ReasoningResult> {
    console.log('WARNING: ReasoningPipelineService is deprecated - No API calls are being made');
    
    // Return a placeholder result without making any API calls
    return {
      steps: [
        {
          name: 'Context Analysis',
          result: 'This service is deprecated. No API calls are being made.',
          confidence: 0
        }
      ],
      decision: 'neutral',
      confidence: 0,
      reasoning: 'This service is deprecated. Real AI decisions are only generated through ProposalFeed when explicitly requested.',
      chainOfThought: 'This is a placeholder. No OpenAI API calls were made.',
      factors: [
        {
          name: 'Placeholder Factor',
          value: 0,
          weight: 0,
          explanation: 'This is a placeholder. No analysis was performed.'
        }
      ]
    };
  }

  /**
   * These methods are kept for compatibility but don't make any API calls
   */
  private static async analyzeProposalContext(
    proposal: ProposalContext,
    persona: PersonaValues
  ): Promise<string> {
    return 'This service is deprecated. No API calls are being made.';
  }

  private static async identifyProposalArguments(
    proposal: ProposalContext,
    proposalInfo: ReturnType<typeof TextProcessingService.extractProposalInfo>,
    persona: PersonaValues
  ): Promise<string> {
    return 'This service is deprecated. No API calls are being made.';
  }

  private static async evaluatePersonaAlignment(
    proposal: ProposalContext,
    persona: PersonaValues,
    argumentAnalysis: string
  ): Promise<string> {
    return 'This service is deprecated. No API calls are being made.';
  }

  private static async generateDecision(
    proposal: ProposalContext,
    persona: PersonaValues,
    previousSteps: ReasoningStep[]
  ): Promise<Omit<ReasoningResult, 'steps'>> {
    return {
      decision: 'neutral',
      confidence: 0,
      reasoning: 'This service is deprecated. No API calls are being made.',
      chainOfThought: 'This is a placeholder. No OpenAI API calls were made.',
      factors: [
        {
          name: 'Placeholder Factor',
          value: 0,
          weight: 0,
          explanation: 'This is a placeholder. No analysis was performed.'
        }
      ]
    };
  }
}
