import { supabase } from '@/lib/supabase';

/**
 * Database service for handling database setup tasks
 */
export class DatabaseService {
  /**
   * Initialize database with required tables if they don't exist
   */
  static async initializeDatabase() {
    try {
      // First check if the profiles table exists
      const { error: checkError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
        
      if (checkError && checkError.message.includes('does not exist')) {
        await this.createProfilesTable();
        await this.createDaosTable();
        await this.createProposalsTable();
        await this.createVotesTable();
        await this.createPersonasTable();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      return false;
    }
  }

  /**
   * Create profiles table
   */
  private static async createProfilesTable() {
    const { error } = await supabase.rpc('create_profiles_table', {});
    if (error) {
      console.error("Error creating profiles table:", error);
      return false;
    }
    return true;
  }

  /**
   * Create daos table
   */
  private static async createDaosTable() {
    const { error } = await supabase.rpc('create_daos_table', {});
    if (error) {
      console.error("Error creating daos table:", error);
      return false;
    }
    return true;
  }

  /**
   * Create proposals table
   */
  private static async createProposalsTable() {
    const { error } = await supabase.rpc('create_proposals_table', {});
    if (error) {
      console.error("Error creating proposals table:", error);
      return false;
    }
    return true;
  }

  /**
   * Create votes table
   */
  private static async createVotesTable() {
    const { error } = await supabase.rpc('create_votes_table', {});
    if (error) {
      console.error("Error creating votes table:", error);
      return false;
    }
    return true;
  }

  /**
   * Create personas table
   */
  private static async createPersonasTable() {
    const { error } = await supabase.rpc('create_personas_table', {});
    if (error) {
      console.error("Error creating personas table:", error);
      return false;
    }
    return true;
  }
}

export default DatabaseService;
