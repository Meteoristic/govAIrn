 import { supabase } from '@/lib/supabase';
import { SnapshotService } from './snapshot.service';
import { ProposalService } from './proposal.service';

export interface Dao {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  platform?: string;
  contract_address?: string;
  governance_url?: string;
  proposal_count?: number; // Calculated on the front-end
  your_delegation_pct?: number; // Populated from user_dao_delegations
  is_base_ecosystem?: boolean;
}

export interface Delegation {
  id: string;
  user_id: string;
  dao_id: string;
  delegation_pct: number;
  persona_id?: string;
  daos?: Dao;
  personas?: any;
}

// Create a proposal count cache to ensure consistent counts across the app
const proposalCountCache = new Map<string, {
  proposalCount: number;
  activeCount: number;
  closedCount: number;
  lastUpdated: number;
}>();

export class DaoService {
  /**
   * List of Base ecosystem DAOs to focus on for the hackathon
   */
  static readonly BASE_ECOSYSTEM_DAOS = [
    {
      id: 'ens.eth',  // Verified working Snapshot space ID
      name: 'ENS',
      platform: 'Snapshot',
      description: 'Ethereum Name Service DAO',
      isBaseSpecific: true,
      fallbackId: 'ens' 
    },
    {
      id: 'gitcoindao.eth',  // Verified working Snapshot space ID
      name: 'Gitcoin',
      platform: 'Snapshot',
      description: 'Public goods funding protocol',
      isBaseSpecific: true,
      fallbackId: 'gitcoin'
    },
    {
      id: 'aavedao.eth',  // Verified working Snapshot space ID
      name: 'Aave',
      platform: 'Snapshot',
      description: 'Liquidity protocol available on Base',
      isBaseSpecific: true,
      fallbackId: 'aave'
    },
    {
      id: 'uniswapgovernance.eth',  // Added Uniswap DAO
      name: 'Uniswap',
      platform: 'Snapshot',
      description: 'Leading decentralized exchange protocol',
      isBaseSpecific: true,
      fallbackId: 'uniswap'
    }
  ];

  /**
   * Get all DAOs
   */
  static async getAllDaos(): Promise<Dao[]> {
    try {
      // First check if any DAOs exist
      const { data: existingData, error: checkError } = await supabase
        .from('daos')
        .select('count');
      
      // If we have no DAOs or error occurred, seed some default DAOs
      if (checkError || !existingData || existingData.length === 0 || existingData[0]?.count === 0) {
        console.log('No DAOs found, seeding default DAOs');
        await this.seedDefaultDaos();
      }

      // Now fetch all DAOs
      const { data, error } = await supabase
        .from('daos')
        .select('*');

      if (error) {
        console.error('Error fetching DAOs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllDaos:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  }

  /**
   * Seed default DAOs for testing
   */
  private static async seedDefaultDaos(): Promise<void> {
    try {
      console.log('Seeding only verified Base ecosystem DAOs');
      
      // We'll use our seedBaseEcosystemDAOs method instead of creating mock DAOs
      await this.seedBaseEcosystemDAOs();
      
    } catch (error) {
      console.error('Error seeding default DAOs:', error);
    }
  }

  /**
   * Add or update a single DAO from the Base ecosystem list
   */
  static async seedBaseEcosystemDAO(dao: any): Promise<any> {
    const { id, name, platform, description, isBaseSpecific, fallbackId } = dao;
    
    try {
      console.log(`Starting to seed DAO: ${name} (${id})`);
      
      // First, check if the DAO already exists, regardless of Snapshot API
      const { data: existingDAO, error: checkError } = await supabase
        .from('daos')
        .select('*')
        .eq('id', id)
        .single();
        
      if (checkError) {
        if (checkError.code === 'PGRST116') { // Not found
          console.log(`DAO ${id} does not exist yet, will create new`);
        } else {
          console.error(`Error checking for existing DAO ${id}:`, checkError);
        }
      } else {
        console.log(`Found existing DAO: ${existingDAO.name} (${existingDAO.id})`);
      }
      
      // Prepare fallback/base data
      const daoData: any = {
        id: fallbackId || id,
        name,
        description: description || '',
        platform: platform || 'Snapshot',
        governance_url: `https://snapshot.org/#/${fallbackId || id}`,
        is_base_ecosystem: isBaseSpecific === true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Try to enrich with Snapshot data, but don't fail if it doesn't work
      try {
        console.log(`Fetching Snapshot data for space: ${id}`);
        const snapshotSpace = await SnapshotService.getSpace(id);
        
        if (snapshotSpace) {
          console.log(`Found Snapshot space for ${name}:`, snapshotSpace.id);
          
          // Enrich our data with Snapshot info
          Object.assign(daoData, {
            name: snapshotSpace.name || name,
            description: snapshotSpace.about || description || '',
            logo_url: snapshotSpace.avatar || '',
            // If we got the space data, update the ID to match exactly what Snapshot uses
            id: snapshotSpace.id
          });
        } else {
          console.warn(`No Snapshot space found for ${id}, using fallback data`);
        }
      } catch (snapshotError) {
        console.warn(`Error fetching Snapshot data for ${id}:`, snapshotError);
        // Continue with fallback data
      }
      
      // Now upsert the DAO
      if (existingDAO) {
        console.log(`Updating existing DAO: ${existingDAO.name} (${existingDAO.id})`);
        // Update the existing DAO
        const { error: updateError } = await supabase
          .from('daos')
          .update({
            ...daoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDAO.id);
          
        if (updateError) {
          console.error(`Error updating DAO ${id}:`, updateError);
          return null;
        }
        
        console.log(`Successfully updated DAO ${name} (${id})`);
        return { ...existingDAO, ...daoData, updated: true, added: false };
      } else {
        console.log(`Inserting new DAO: ${name} (${id || fallbackId})`);
        // Insert the new DAO
        const { data: newDAO, error: insertError } = await supabase
          .from('daos')
          .insert(daoData)
          .select()
          .single();
          
        if (insertError) {
          console.error(`Error inserting DAO ${id}:`, insertError);
          console.error(`DAO data attempted to insert:`, JSON.stringify(daoData, null, 2));
          return null;
        }
        
        console.log(`Successfully added new DAO ${name} (${id})`);
        return { ...newDAO, added: true, updated: false };
      }
    } catch (error) {
      console.error(`Unexpected error seeding DAO ${id}:`, error);
      return null;
    }
  }

  /**
   * Seed the database with Base ecosystem DAOs
   * This now uses a serverless function to bypass RLS policies
   */
  static async seedBaseEcosystemDAOs(): Promise<{
    added: number;
    updated: number;
    failed: number;
  }> {
    try {
      console.log('Initializing Base ecosystem DAOs via Edge Function...');
      
      // Use the Edge Function to initialize DAOs with accurate information
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-base-daos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error initializing Base ecosystem DAOs:', errorText);
        throw new Error(`Failed to initialize Base ecosystem DAOs: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Base ecosystem DAOs initialized:', result);
      
      // Return the initialization results
      return {
        added: result.result?.added || 0,
        updated: result.result?.updated || 0,
        failed: result.result?.failed || 0
      };
    } catch (error) {
      console.error('Error seeding Base ecosystem DAOs:', error);
      return { added: 0, updated: 0, failed: 0 };
    }
  }

  /**
   * Get a single DAO by ID
   */
  static async getDAO(daoId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('daos')
        .select('*')
        .eq('id', daoId)
        .single();
        
      if (error) {
        console.error(`Error fetching DAO ${daoId}:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error in getDAO(${daoId}):`, error);
      return null;
    }
  }

  /**
   * Get a single DAO by ID
   */
  static async getDaoById(daoId: string): Promise<Dao | null> {
    const { data, error } = await supabase
      .from('daos')
      .select('*')
      .eq('id', daoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // DAO not found
      }
      console.error('Error fetching DAO:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get user's delegations
   */
  static async getUserDelegations(userId: string): Promise<Delegation[]> {
    const { data, error } = await supabase
      .from('user_dao_delegations')
      .select('*, daos(*), personas(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user delegations:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get delegation for a specific DAO
   */
  static async getUserDelegationForDao(userId: string, daoId: string): Promise<Delegation | null> {
    const { data, error } = await supabase
      .from('user_dao_delegations')
      .select('*, daos(*), personas(*)')
      .eq('user_id', userId)
      .eq('dao_id', daoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Delegation not found
      }
      console.error('Error fetching user delegation:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create or update a delegation
   */
  static async saveDelegation(userId: string, daoId: string, delegationPct: number, personaId?: string): Promise<Delegation> {
    // Check if delegation already exists
    const existing = await this.getUserDelegationForDao(userId, daoId);
    
    if (existing) {
      // Update existing delegation
      const { data, error } = await supabase
        .from('user_dao_delegations')
        .update({ 
          delegation_pct: delegationPct,
          persona_id: personaId 
        })
        .eq('id', existing.id)
        .select('*, daos(*), personas(*)')
        .single();

      if (error) {
        console.error('Error updating delegation:', error);
        throw error;
      }

      return data;
    } else {
      // Create new delegation
      const { data, error } = await supabase
        .from('user_dao_delegations')
        .insert({ 
          user_id: userId,
          dao_id: daoId,
          delegation_pct: delegationPct,
          persona_id: personaId
        })
        .select('*, daos(*), personas(*)')
        .single();

      if (error) {
        console.error('Error creating delegation:', error);
        throw error;
      }

      return data;
    }
  }

  /**
   * Delete a delegation
   */
  static async deleteDelegation(delegationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_dao_delegations')
      .delete()
      .eq('id', delegationId);

    if (error) {
      console.error('Error deleting delegation:', error);
      throw error;
    }
  }

  /**
   * Sync DAO information from Snapshot
   */
  static async syncDAOFromSnapshot(spaceId: string): Promise<string | null> {
    try {
      // Get space data from Snapshot
      const spaceData = await SnapshotService.getSpace(spaceId);
      
      if (!spaceData) {
        console.error(`Failed to fetch data for Snapshot space: ${spaceId}`);
        return null;
      }
      
      // Check if DAO already exists
      const { data: existingDAO, error: checkError } = await supabase
        .from('daos')
        .select('id')
        .eq('id', spaceId)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`Error checking for existing DAO ${spaceId}:`, checkError);
      }
      
      // Get active proposals count
      const activeProposals = await SnapshotService.getProposals(spaceId, 'active');
      const proposalCount = activeProposals.length;
      
      // Determine the platform based on the network
      let platform = 'Unknown';
      if (spaceData.network) {
        // Convert network ID to readable name
        switch (spaceData.network) {
          case '1':
            platform = 'Ethereum';
            break;
          case '8453':
            platform = 'Base';
            break;
          case '10':
            platform = 'Optimism';
            break;
          case '42161':
            platform = 'Arbitrum';
            break;
          case '137':
            platform = 'Polygon';
            break;
          default:
            platform = `Chain ID: ${spaceData.network}`;
        }
      } else {
        platform = 'Snapshot'; // Default if no network specified
      }
      
      // Format data for storage with enhanced details
      const daoData = {
        id: spaceId,
        name: spaceData.name,
        logo_url: spaceData.avatar,
        description: spaceData.about,
        platform,
        governance_url: `https://snapshot.org/#/${spaceId}`,
        contract_address: null, // We don't have this from Snapshot
        updated_at: new Date().toISOString()
      };
      
      // Insert or update DAO info
      if (existingDAO) {
        const { error: updateError } = await supabase
          .from('daos')
          .update(daoData)
          .eq('id', spaceId);
          
        if (updateError) {
          console.error(`Error updating DAO ${spaceId}:`, updateError);
          return null;
        }
      } else {
        const { error: insertError } = await supabase
          .from('daos')
          .insert({
            ...daoData,
            created_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error(`Error inserting DAO ${spaceId}:`, insertError);
          return null;
        }
      }
      
      return spaceId;
    } catch (error) {
      console.error(`Error syncing DAO from Snapshot ${spaceId}:`, error);
      return null;
    }
  }

  /**
   * List DAOs with snapshot information
   */
  static async listSnapshotDAOs() {
    try {
      const { data, error } = await supabase
        .from('daos')
        .select('*')
        .eq('platform', 'Snapshot')
        .order('name');
        
      if (error) {
        console.error('Error listing Snapshot DAOs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error listing Snapshot DAOs:', error);
      return [];
    }
  }

  /**
   * Get all Base ecosystem DAOs
   */
  static async getBaseEcosystemDAOs() {
    try {
      const { data, error } = await supabase
        .from('daos')
        .select('*')
        .eq('is_base_ecosystem', true)
        .order('name');
        
      if (error) {
        console.error('Error getting Base ecosystem DAOs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting Base ecosystem DAOs:', error);
      return [];
    }
  }

  /**
   * Update DAO with accurate proposal count and information
   */
  static async updateDAOWithAccurateInfo(daoId: string): Promise<{proposalCount: number, platform: string, activeCount: number, closedCount: number}> {
    try {
      console.log(`Starting to update DAO info for: ${daoId}`);
      
      // Check if we have cached data less than 5 minutes old
      const now = Date.now();
      const cachedData = proposalCountCache.get(daoId);
      if (cachedData && (now - cachedData.lastUpdated < 5 * 60 * 1000)) {
        console.log(`Using cached proposal counts for ${daoId}: ${cachedData.proposalCount} total`);
        
        return {
          proposalCount: cachedData.proposalCount,
          activeCount: cachedData.activeCount,
          closedCount: cachedData.closedCount,
          platform: 'Unknown' // We'll get this below
        };
      }
      
      // Get accurate proposal counts using the new method
      const proposalCounts = await SnapshotService.getTotalProposalCount(daoId);
      console.log(`DAO ${daoId} has ${proposalCounts.totalCount} total proposals (${proposalCounts.activeCount} active, ${proposalCounts.closedCount} closed)`);
      
      // Cache the results
      proposalCountCache.set(daoId, {
        proposalCount: proposalCounts.totalCount,
        activeCount: proposalCounts.activeCount,
        closedCount: proposalCounts.closedCount,
        lastUpdated: now
      });
      
      // Get the space data for additional information
      const spaceData = await SnapshotService.getSpace(daoId);
      
      if (!spaceData) {
        console.error(`Failed to fetch Snapshot data for DAO: ${daoId}`);
        return { 
          proposalCount: proposalCounts.totalCount,
          activeCount: proposalCounts.activeCount,
          closedCount: proposalCounts.closedCount,
          platform: 'Unknown'
        };
      }
      
      // Determine the platform based on the network
      let platform = 'Snapshot'; // Default
      if (spaceData.network) {
        // Convert network ID to readable name
        switch (spaceData.network) {
          case '1':
            platform = 'Ethereum';
            break;
          case '8453':
            platform = 'Base';
            break;
          case '10':
            platform = 'Optimism';
            break;
          case '42161':
            platform = 'Arbitrum';
            break;
          case '137':
            platform = 'Polygon';
            break;
          default:
            platform = `Chain ID: ${spaceData.network}`;
        }
      }
      
      console.log(`DAO ${daoId} identified platform: ${platform}`);
      
      // Update the DAO in the database (with only the columns that exist)
      const { data, error } = await supabase
        .from('daos')
        .update({
          platform,
          logo_url: spaceData.avatar || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', daoId)
        .select();
        
      if (error) {
        console.error(`Error updating DAO ${daoId} with accurate info:`, error);
      } else {
        console.log(`Successfully updated DAO ${daoId}:`, data);
      }
      
      // Return the proposal counts to be used by the front-end
      return { 
        proposalCount: proposalCounts.totalCount,
        activeCount: proposalCounts.activeCount,
        closedCount: proposalCounts.closedCount,
        platform
      };
    } catch (error) {
      console.error(`Error updating DAO with accurate info: ${daoId}`, error);
      
      // Return cached data if available, even if there was an error
      const cachedData = proposalCountCache.get(daoId);
      if (cachedData) {
        return {
          proposalCount: cachedData.proposalCount,
          activeCount: cachedData.activeCount,
          closedCount: cachedData.closedCount,
          platform: 'Unknown'
        };
      }
      
      return { 
        proposalCount: 0,
        activeCount: 0,
        closedCount: 0,
        platform: 'Unknown' 
      };
    }
  }
  
  /**
   * Get cached proposal counts or fetch from API if not in cache
   */
  static async getProposalCounts(daoId: string): Promise<{
    proposalCount: number;
    activeCount: number;
    closedCount: number;
  }> {
    // Check if we have cached data
    const cachedData = proposalCountCache.get(daoId);
    if (cachedData) {
      return {
        proposalCount: cachedData.proposalCount,
        activeCount: cachedData.activeCount,
        closedCount: cachedData.closedCount
      };
    }
    
    // If not in cache, fetch from API
    try {
      const result = await this.updateDAOWithAccurateInfo(daoId);
      return {
        proposalCount: result.proposalCount,
        activeCount: result.activeCount,
        closedCount: result.closedCount
      };
    } catch (error) {
      console.error(`Error getting proposal counts for ${daoId}:`, error);
      return {
        proposalCount: 0,
        activeCount: 0,
        closedCount: 0
      };
    }
  }
}
