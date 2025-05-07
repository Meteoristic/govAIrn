/**
 * Governance Metrics Service
 * 
 * This service provides metrics for DAO governance health using a strategy pattern.
 * The current implementation uses basic text analysis and snapshot data, but
 * it's designed to be easily replaced with an AI-based implementation in the future.
 */

import axios from "axios";

// Types for proposal data
export interface ProposalData {
  id: string;
  title: string;
  body?: string;
  start?: number;
  end?: number;
  state: string;
  scores_total?: number;
  votes?: number;
  scores?: any;
  quorum?: number;
  created?: number;
}

// Types for space (DAO) data
export interface SpaceData {
  id: string;
  name: string;
  about?: string;
  network?: string;
  avatar?: string;
  votesCount?: number;
  followersCount?: number;
  proposalsCount?: number;
}

// Interface for metrics results
export interface GovernanceMetrics {
  turnout: number;
  throughput: number;
  treasuryDelta: number;
}

// Strategy interface for calculating metrics
export interface MetricsCalculationStrategy {
  calculateMetrics(spaceId: string, proposals: ProposalData[], space: SpaceData): Promise<GovernanceMetrics>;
}

/**
 * Basic metrics calculator that uses simple text analysis and Snapshot data.
 * This is our current implementation.
 */
export class BasicMetricsCalculator implements MetricsCalculationStrategy {
  /**
   * Calculate governance metrics using basic analysis methods
   */
  async calculateMetrics(
    spaceId: string, 
    proposals: ProposalData[], 
    space: SpaceData
  ): Promise<GovernanceMetrics> {
    // Calculate turnout (0-100%)
    const turnout = this.calculateTurnout(proposals, space);
    
    // Calculate proposal throughput (proposals/month)
    const throughput = this.calculateThroughput(proposals, space);
    
    // Calculate treasury delta (-100% to +100%)
    const treasuryDelta = this.calculateTreasuryDelta(proposals);
    
    return {
      turnout,
      throughput,
      treasuryDelta
    };
  }

  /**
   * Calculate DAO turnout based on voting participation
   */
  private calculateTurnout(proposals: ProposalData[], space: SpaceData): number {
    if (proposals.length === 0) return 0;
    
    // Calculate average voter participation in recent proposals
    let totalVoterPercentage = 0;
    let proposalsWithTurnoutData = 0;
    
    for (const proposal of proposals) {
      if (proposal.votes && proposal.votes > 0) {
        // If we have a quorum value, use that for calculating turnout percentage
        if (proposal.quorum && proposal.scores_total) {
          const participationRate = Math.min(100, (proposal.scores_total / proposal.quorum) * 100);
          totalVoterPercentage += participationRate;
          proposalsWithTurnoutData++;
        } 
        // Otherwise use votes vs. followers ratio
        else if (space.followersCount) {
          const participationRate = Math.min(100, (proposal.votes / space.followersCount) * 100);
          totalVoterPercentage += participationRate;
          proposalsWithTurnoutData++;
        }
      }
    }
    
    // Average turnout across proposals with data
    if (proposalsWithTurnoutData > 0) {
      return Math.round(totalVoterPercentage / proposalsWithTurnoutData);
    } else {
      // Fallback: Estimate based on total votes vs. followers
      return Math.min(60, Math.round((space.votesCount || 0) / (space.followersCount || 1) * 10));
    }
  }

  /**
   * Calculate proposal throughput (proposals/month)
   */
  private calculateThroughput(proposals: ProposalData[], space: SpaceData): number {
    if (proposals.length === 0) return 0;
    
    // Method: Calculate recent proposal velocity
    try {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      
      // Count proposals created in the last 6 months
      const recentProposals = proposals.filter(p => {
        const created = p.created ? new Date(p.created * 1000) : null;
        return created && created >= sixMonthsAgo;
      });
      
      // Calculate average per month over 6 month period
      return recentProposals.length / 6;
    } catch (e) {
      console.error(`Error calculating throughput:`, e);
      // Fallback: Use total proposal count divided by assumed DAO age
      return (space.proposalsCount || 0) / 24; // Assume DAO is up to 2 years old on average
    }
  }

  /**
   * Calculate treasury delta based on proposal content
   */
  private calculateTreasuryDelta(proposals: ProposalData[]): number {
    if (proposals.length === 0) return 0;
    
    // Method: Analyze proposal text for financial impact
    // Count financial proposals (those mentioning funds, treasury, allocation, etc.)
    const financialTerms = ['treasury', 'fund', 'allocat', 'budget', 'spend', 'grant'];
    let financialCount = 0;
    let positiveImpact = 0;
    let negativeImpact = 0;
    
    for (const proposal of proposals) {
      const text = (proposal.title + ' ' + (proposal.body || '')).toLowerCase();
      const isFinancial = financialTerms.some(term => text.includes(term));
      
      if (isFinancial) {
        financialCount++;
        
        // Simple sentiment analysis for financial impact
        const positiveTerms = ['increase', 'grow', 'return', 'profit', 'earn', 'revenue'];
        const negativeTerms = ['decrease', 'spend', 'cost', 'expense', 'allocate', 'fund'];
        
        const positiveMatches = positiveTerms.filter(term => text.includes(term)).length;
        const negativeMatches = negativeTerms.filter(term => text.includes(term)).length;
        
        if (positiveMatches > negativeMatches) {
          positiveImpact++;
        } else if (negativeMatches > positiveMatches) {
          negativeImpact++;
        }
      }
    }
    
    // Calculate net financial sentiment (-100 to +100)
    if (financialCount > 0) {
      return Math.round(((positiveImpact - negativeImpact) / financialCount) * 50);
    } else {
      return 0; // Neutral if no financial proposals
    }
  }
}

/**
 * Placeholder for the future AI-based metrics calculator
 * This will be implemented when the AI decision agent is ready
 */
export class AIMetricsCalculator implements MetricsCalculationStrategy {
  async calculateMetrics(
    spaceId: string, 
    proposals: ProposalData[], 
    space: SpaceData
  ): Promise<GovernanceMetrics> {
    // This is just a placeholder - the real implementation will use the AI decision agent
    console.log("AI-based metric calculation not yet implemented");
    
    // For now, fall back to the basic calculator
    const basicCalculator = new BasicMetricsCalculator();
    return basicCalculator.calculateMetrics(spaceId, proposals, space);
  }
}

/**
 * Main service that provides governance metrics
 */
export class GovernanceMetricsService {
  private static instance: GovernanceMetricsService;
  private calculator: MetricsCalculationStrategy;
  private readonly API_URL = 'https://hub.snapshot.org/graphql';
  
  private constructor(useAI: boolean = false) {
    // Select the appropriate strategy
    this.calculator = useAI ? new AIMetricsCalculator() : new BasicMetricsCalculator();
  }
  
  /**
   * Get the singleton instance of the service
   */
  public static getInstance(useAI: boolean = false): GovernanceMetricsService {
    if (!GovernanceMetricsService.instance) {
      GovernanceMetricsService.instance = new GovernanceMetricsService(useAI);
    }
    return GovernanceMetricsService.instance;
  }
  
  /**
   * Switch the calculation strategy
   */
  public useAICalculator(useAI: boolean): void {
    this.calculator = useAI ? new AIMetricsCalculator() : new BasicMetricsCalculator();
  }
  
  /**
   * Get governance health metrics for a DAO
   */
  public async getGovernanceHealth(spaceId: string): Promise<GovernanceMetrics> {
    try {
      // Fetch the data needed for the calculations
      const { proposals, space } = await this.fetchGovernanceData(spaceId);
      
      // Use the selected strategy to calculate metrics
      const metrics = await this.calculator.calculateMetrics(spaceId, proposals, space);
      
      console.log(`Governance metrics for ${spaceId}: Turnout=${metrics.turnout}%, Throughput=${metrics.throughput.toFixed(2)}/month, Treasury=${metrics.treasuryDelta}%`);
      
      return metrics;
    } catch (error) {
      console.error(`Error getting governance health for ${spaceId}:`, error);
      return {
        turnout: 0,
        throughput: 0,
        treasuryDelta: 0
      };
    }
  }
  
  /**
   * Fetch DAO and proposal data from Snapshot API
   */
  private async fetchGovernanceData(spaceId: string): Promise<{ proposals: ProposalData[], space: SpaceData }> {
    // Use the verified query from our test script
    const query = `
      query {
        proposals(
          first: 20,
          skip: 0,
          where: {
            space: "${spaceId}",
            state: "closed"
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          start
          end
          scores_total
          votes
          scores
          quorum
          created
        }
        space(id: "${spaceId}") {
          id
          name
          votesCount
          followersCount
          proposalsCount
        }
      }
    `;
    
    const response = await axios.post(this.API_URL, { query });
    const proposals = response.data?.data?.proposals || [];
    const space = response.data?.data?.space || {};
    
    console.log(`Fetched governance data for ${spaceId}: ${proposals.length} proposals`);
    
    return { proposals, space };
  }
}

// Export the default instance for easy use
export default GovernanceMetricsService.getInstance();
