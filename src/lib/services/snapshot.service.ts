import axios from 'axios';
import governanceMetricsService from './governance-metrics.service';

export interface SnapshotSpace {
  id: string;
  name: string;
  about: string;
  network: string;
  symbol: string;
  strategies: any[];
  avatar: string;
  terms: string;
  website: string;
  followersCount: number;
}

export interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;
  state: string;
  space: {
    id: string;
    name: string;
  };
}

export class SnapshotService {
  private static readonly API_URL = 'https://hub.snapshot.org/graphql';

  /**
   * Fetch a specific space from Snapshot
   */
  static async getSpace(spaceId: string): Promise<SnapshotSpace | null> {
    try {
      // Enhanced query to get more comprehensive information
      const query = `
        query {
          space(id: "${spaceId}") {
            id
            name
            about
            network
            symbol
            avatar
            website
            terms
            strategies {
              name
            }
            followersCount
          }
        }
      `;

      const response = await axios.post(this.API_URL, { query });
      
      if (response.data?.data?.space) {
        return {
          ...response.data.data.space,
          // Add defaults for missing fields to avoid errors
          about: response.data.data.space.about || '',
          network: response.data.data.space.network || '',
          symbol: response.data.data.space.symbol || '',
          avatar: response.data.data.space.avatar || '',
          terms: response.data.data.space.terms || '',
          website: response.data.data.space.website || '',
          strategies: response.data.data.space.strategies || []
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Snapshot space ${spaceId}:`, error);
      return null;
    }
  }

  /**
   * Fetch proposals for a Snapshot space
   */
  static async getProposals(spaceId: string, state: string = 'all'): Promise<any[]> {
    try {
      console.log(`Fetching proposals for ${spaceId} with state: ${state}`);
      
      // Using the exact query format from test-snapshot-api.js that works
      let stateFilter = '';
      if (state && state !== 'all') {
        stateFilter = `state: "${state}",`;
      }
      
      const query = `
        query {
          proposals(
            first: 50,
            skip: 0,
            where: {
              space: "${spaceId}",
              ${stateFilter}
            },
            orderBy: "created",
            orderDirection: desc
          ) {
            id
            title
            body
            choices
            start
            end
            snapshot
            state
            space {
              id
              name
            }
          }
        }
      `;

      console.log(`Query for ${spaceId}:`, query);
      
      const response = await axios.post(this.API_URL, { query });
      
      console.log(`Raw response for ${spaceId}:`, JSON.stringify(response.data, null, 2));
      
      if (response.data?.data?.proposals) {
        console.log(`Found ${response.data.data.proposals.length} proposals for ${spaceId}`);
        return response.data.data.proposals;
      }
      
      console.log(`No proposals found for ${spaceId}`);
      return [];
    } catch (error) {
      console.error(`Error fetching proposals for space ${spaceId}:`, error);
      return [];
    }
  }

  /**
   * Fetch a single proposal by ID
   */
  static async getProposal(proposalId: string): Promise<SnapshotProposal | null> {
    try {
      const query = `
        query {
          proposal(id: "${proposalId}") {
            id
            title
            body
            choices
            start
            end
            snapshot
            state
            space {
              id
              name
            }
          }
        }
      `;

      const response = await axios.post(this.API_URL, { query });
      return response.data.data.proposal;
    } catch (error) {
      console.error(`Error fetching Snapshot proposal ${proposalId}:`, error);
      return null;
    }
  }

  /**
   * Get total proposal count for a space
   */
  static async getTotalProposalCount(spaceId: string): Promise<{activeCount: number, closedCount: number, totalCount: number}> {
    try {
      console.log(`Fetching total proposal count for ${spaceId}`);
      
      // Using the verified query from our test script
      const spaceQuery = `
        query {
          space(id: "${spaceId}") {
            id
            name
            proposalsCount
          }
        }
      `;
      
      const activeQuery = `
        query {
          proposals(
            where: {
              space: "${spaceId}",
              state: "active"
            }
          ) {
            id
          }
        }
      `;
      
      const closedQuery = `
        query {
          proposals(
            first: 1000,
            where: {
              space: "${spaceId}",
              state: "closed"
            }
          ) {
            id
          }
        }
      `;
      
      try {
        // Run all queries in parallel for speed
        const [spaceResponse, activeResponse, closedResponse] = await Promise.all([
          axios.post(this.API_URL, { query: spaceQuery }),
          axios.post(this.API_URL, { query: activeQuery }),
          axios.post(this.API_URL, { query: closedQuery })
        ]);
        
        // Get total from space data (verified to be accurate)
        const totalCount = spaceResponse.data?.data?.space?.proposalsCount || 0;
        
        // Get active and closed counts
        const activeCount = activeResponse.data?.data?.proposals?.length || 0;
        const closedCount = closedResponse.data?.data?.proposals?.length || 0;
        
        // Calculate our own total as a backup
        const calculatedTotal = activeCount + closedCount;
        
        // Use the space count if available, otherwise fall back to calculated
        const finalTotal = totalCount || calculatedTotal;
        
        console.log(`${spaceId} has ${finalTotal} total proposals (${activeCount} active, ${closedCount} closed)`);
        
        return {
          activeCount,
          closedCount,
          totalCount: finalTotal
        };
      } catch (error) {
        console.error(`Error in API calls for ${spaceId}:`, error);
        // Fall back to a simpler query if the parallel approach fails
        const simpleQuery = `
          query {
            space(id: "${spaceId}") {
              proposalsCount
            }
          }
        `;
        
        const response = await axios.post(this.API_URL, { query: simpleQuery });
        const count = response.data?.data?.space?.proposalsCount || 0;
        
        return {
          activeCount: 0,
          closedCount: count,
          totalCount: count
        };
      }
    } catch (error) {
      console.error(`Error getting proposal count for ${spaceId}:`, error);
      return { activeCount: 0, closedCount: 0, totalCount: 0 };
    }
  }

  /**
   * Get governance health metrics for a DAO
   */
  static async getGovernanceHealth(spaceId: string): Promise<{
    turnout: number,
    throughput: number,
    treasuryDelta: number
  }> {
    try {
      // Use the new governance metrics service to calculate metrics
      return await governanceMetricsService.getGovernanceHealth(spaceId);
    } catch (error) {
      console.error(`Error getting governance health for ${spaceId}:`, error);
      return {
        turnout: 0,
        throughput: 0,
        treasuryDelta: 0
      };
    }
  }
}
