import { PersonaValues } from '@/types/persona';
import { TextProcessingService } from './text-processing.service';

/**
 * Interfaces for the persona matching service
 */
export interface ProposalMatchContext {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  keywords?: string[];
  status?: string;
}

export interface MatchResult {
  score: number;
  factors: {
    name: string;
    score: number;
    weight: number;
    explanation: string;
  }[];
  reasoning: string;
}

/**
 * PersonaMatchingService determines how well a proposal aligns with a user's persona
 * This service provides algorithms for matching proposals to personas without modifying UI
 * 
 * IMPORTANT: This service has been optimized to NEVER make OpenAI API calls.
 * All AI-generated content is now handled exclusively by the ProposalFeed component
 * when a user clicks the "Load Live Data" button.
 */
export class PersonaMatchingService {
  /**
   * Calculate a match score between a proposal and a persona
   * @returns Score from 0-100 representing match quality
   */
  static async calculateMatchScore(
    proposal: ProposalMatchContext,
    persona: PersonaValues
  ): Promise<MatchResult> {
    // Only use fast matching algorithm - no API calls are made
    console.log('Using fast matching to avoid API calls');
    return this.fastMatchCalculation(proposal, persona);
  }
  
  /**
   * Fast matching algorithm using heuristics
   * This method doesn't use the API and is much faster, though less nuanced
   */
  private static fastMatchCalculation(
    proposal: ProposalMatchContext,
    persona: PersonaValues
  ): MatchResult {
    // Extract key information
    const text = [
      proposal.title || '',
      proposal.summary || '',
      proposal.description || ''
    ].join(' ').toLowerCase();
    
    // Calculate risk match
    const riskMatch = this.calculateRiskMatch(text, persona.risk);
    
    // Calculate ESG match
    const esgMatch = this.calculateESGMatch(text, persona.esg);
    
    // Calculate treasury match
    const treasuryMatch = this.calculateTreasuryMatch(text, persona.treasury);
    
    // Calculate time horizon match
    const horizonMatch = this.calculateHorizonMatch(text, persona.horizon);
    
    // Combine factors with weights
    const factors = [
      {
        name: 'Risk Alignment',
        score: riskMatch.score,
        weight: 30,
        explanation: riskMatch.explanation
      },
      {
        name: 'ESG Alignment',
        score: esgMatch.score,
        weight: 25,
        explanation: esgMatch.explanation
      },
      {
        name: 'Treasury Alignment',
        score: treasuryMatch.score,
        weight: 25,
        explanation: treasuryMatch.explanation
      },
      {
        name: 'Time Horizon Alignment',
        score: horizonMatch.score,
        weight: 20,
        explanation: horizonMatch.explanation
      }
    ];
    
    // Calculate overall score as weighted average
    const score = Math.round(
      factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) /
      factors.reduce((sum, factor) => sum + factor.weight, 0)
    );
    
    return {
      score,
      factors,
      reasoning: `Proposal "${proposal.title}" matches your persona with a score of ${score}/100. This is based on alignment with your risk preference (${persona.risk}/100), ESG focus (${persona.esg}/100), treasury conservation (${persona.treasury}/100), and time horizon (${persona.horizon}/100).`
    };
  }
  
  /**
   * Calculate risk match between proposal and persona
   */
  private static calculateRiskMatch(
    text: string,
    riskPreference: number
  ): { score: number; explanation: string } {
    // Risk-related keywords
    const lowRiskTerms = ['safe', 'secure', 'conservative', 'low risk', 'stable', 'proven'];
    const mediumRiskTerms = ['balanced', 'moderate', 'reasonable', 'controlled'];
    const highRiskTerms = ['aggressive', 'high risk', 'experimental', 'innovative', 'uncertain'];
    
    // Count occurrences
    const lowRiskCount = lowRiskTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    const mediumRiskCount = mediumRiskTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    const highRiskCount = highRiskTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    
    // Determine proposal risk level
    let proposalRiskLevel = 50; // Default to medium risk
    
    if (highRiskCount > lowRiskCount) {
      proposalRiskLevel = Math.min(90, 50 + 10 * (highRiskCount - lowRiskCount));
    } else if (lowRiskCount > highRiskCount) {
      proposalRiskLevel = Math.max(10, 50 - 10 * (lowRiskCount - highRiskCount));
    }
    
    // If we have medium risk indicators, pull toward center
    if (mediumRiskCount > 0) {
      proposalRiskLevel = Math.round((proposalRiskLevel + 50) / 2);
    }
    
    // Calculate match score
    const score = Math.max(0, 100 - Math.abs(proposalRiskLevel - riskPreference) * 2);
    
    // Generate explanation
    let explanation = 'The proposal has a ';
    if (proposalRiskLevel < 30) explanation += 'conservative risk profile';
    else if (proposalRiskLevel < 70) explanation += 'moderate risk profile';
    else explanation += 'higher risk profile';
    
    explanation += `, which ${
      score > 70 ? 'aligns well with' : 
      score > 40 ? 'somewhat aligns with' : 
      'does not align well with'
    } your risk preference.`;
    
    return { score, explanation };
  }
  
  /**
   * Calculate ESG match between proposal and persona
   */
  private static calculateESGMatch(
    text: string,
    esgPreference: number
  ): { score: number; explanation: string } {
    // ESG-related keywords
    const esgTerms = [
      'esg', 'environmental', 'social', 'governance', 'sustainable', 
      'ethical', 'impact', 'community', 'climate', 'carbon', 'emissions', 'diversity'
    ];
    
    // Count occurrences
    const esgCount = esgTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    
    // Determine proposal ESG focus level
    let proposalEsgLevel = Math.min(95, esgCount * 15);
    
    // Adjust level based on title
    if (text.includes('esg') || text.includes('sustainable')) {
      proposalEsgLevel = Math.min(95, proposalEsgLevel + 30);
    }
    
    // Calculate match score
    // Higher preference = more importance placed on ESG
    // For high ESG preference, a low ESG proposal is a poor match
    // For low ESG preference, ESG content is less critical
    const score = esgPreference > 50 
      ? Math.max(0, 100 - Math.max(0, esgPreference - proposalEsgLevel)) 
      : Math.min(100, 100 - Math.abs(esgPreference - proposalEsgLevel) / 2);
    
    // Generate explanation
    let explanation = 'The proposal has ';
    if (proposalEsgLevel < 20) explanation += 'minimal ESG considerations';
    else if (proposalEsgLevel < 50) explanation += 'some ESG elements';
    else if (proposalEsgLevel < 80) explanation += 'significant ESG components';
    else explanation += 'strong ESG focus';
    
    explanation += `, which ${
      score > 70 ? 'matches well with' : 
      score > 40 ? 'is compatible with' : 
      'may not fully satisfy'
    } your ESG preferences.`;
    
    return { score, explanation };
  }
  
  /**
   * Calculate treasury match between proposal and persona
   */
  private static calculateTreasuryMatch(
    text: string,
    treasuryPreference: number
  ): { score: number; explanation: string } {
    // Treasury-related keywords
    const conservativeTerms = ['conservative', 'savings', 'reserve', 'retain', 'minimal spend', 'low cost'];
    const moderateTerms = ['balanced', 'moderate', 'reasonable cost', 'efficient'];
    const aggressiveTerms = ['spend', 'invest', 'allocate', 'fund', 'high cost', 'expensive'];
    
    // Count occurrences
    const conservativeCount = conservativeTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    const moderateCount = moderateTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    const aggressiveCount = aggressiveTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    
    // Determine proposal treasury approach
    // Higher value = more conservative (matching the persona scale)
    let proposalTreasuryLevel = 50; // Default to moderate spending
    
    if (conservativeCount > aggressiveCount) {
      proposalTreasuryLevel = Math.min(90, 50 + 10 * (conservativeCount - aggressiveCount));
    } else if (aggressiveCount > conservativeCount) {
      proposalTreasuryLevel = Math.max(10, 50 - 10 * (aggressiveCount - conservativeCount));
    }
    
    // If we have moderate indicators, pull toward center
    if (moderateCount > 0) {
      proposalTreasuryLevel = Math.round((proposalTreasuryLevel + 50) / 2);
    }
    
    // Calculate match score
    const score = Math.max(0, 100 - Math.abs(proposalTreasuryLevel - treasuryPreference) * 2);
    
    // Generate explanation
    let explanation = 'The proposal takes a ';
    if (proposalTreasuryLevel < 30) explanation += 'more aggressive treasury approach';
    else if (proposalTreasuryLevel < 70) explanation += 'balanced resource allocation approach';
    else explanation += 'conservative treasury management approach';
    
    explanation += `, which ${
      score > 70 ? 'aligns well with' : 
      score > 40 ? 'somewhat aligns with' : 
      'differs from'
    } your treasury management preference.`;
    
    return { score, explanation };
  }
  
  /**
   * Calculate time horizon match between proposal and persona
   */
  private static calculateHorizonMatch(
    text: string,
    horizonPreference: number
  ): { score: number; explanation: string } {
    // Time horizon related keywords
    const shortTermTerms = ['immediate', 'short-term', 'quick', 'urgent', 'temporary'];
    const longTermTerms = ['long-term', 'sustainable', 'future', 'permanent', 'roadmap', 'vision', 'strategy'];
    
    // Count occurrences
    const shortTermCount = shortTermTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    const longTermCount = longTermTerms.reduce((count, term) => 
      count + (text.includes(term) ? 1 : 0), 0);
    
    // Determine proposal time horizon
    // Higher value = longer time horizon
    let proposalHorizonLevel = 50; // Default to medium term
    
    if (longTermCount > shortTermCount) {
      proposalHorizonLevel = Math.min(90, 50 + 10 * (longTermCount - shortTermCount));
    } else if (shortTermCount > longTermCount) {
      proposalHorizonLevel = Math.max(10, 50 - 10 * (shortTermCount - longTermCount));
    }
    
    // Calculate match score
    const score = Math.max(0, 100 - Math.abs(proposalHorizonLevel - horizonPreference) * 2);
    
    // Generate explanation
    let explanation = 'The proposal has a ';
    if (proposalHorizonLevel < 30) explanation += 'short-term focus';
    else if (proposalHorizonLevel < 70) explanation += 'medium-term outlook';
    else explanation += 'long-term perspective';
    
    explanation += `, which ${
      score > 70 ? 'aligns well with' : 
      score > 40 ? 'somewhat aligns with' : 
      'does not align well with'
    } your time horizon preference.`;
    
    return { score, explanation };
  }
}
