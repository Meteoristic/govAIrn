import { supabase } from '@/lib/supabase';
import { PersonaValues } from '@/types/persona';

// Environment check for development mode
const isDevelopmentMode = import.meta.env.DEV;

export interface Persona extends PersonaValues {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  wallet_address?: string;
}

export class PersonaService {
  /**
   * Get all personas for a user
   */
  static async getUserPersonas(userId: string): Promise<Persona[]> {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching personas:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Get active persona for a user
   */
  static async getActivePersona(userId: string): Promise<Persona | null> {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching active persona:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get a specific persona by ID
   */
  static async getPersonaById(personaId: string): Promise<Persona | null> {
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .eq('id', personaId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Persona not found
      }
      console.error('Error fetching persona:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Get all personas for a user by wallet address
   * This is a development mode workaround for the auth system issue
   */
  static async getPersonasByWallet(walletAddress: string): Promise<Persona[]> {
    if (!walletAddress) return [];
    
    // Normalize the wallet address to lowercase
    const normalizedWallet = walletAddress.toLowerCase();
    
    // First try to find personas through the wallet_addresses table
    const { data: walletData, error: walletError } = await supabase
      .from('wallet_addresses')
      .select('user_id')
      .eq('wallet_address', normalizedWallet);
    
    if (walletError) {
      console.error('Error fetching wallet data:', walletError);
    }
    
    // If we found a user ID from the wallet, use that to get personas
    if (walletData && walletData.length > 0) {
      const userId = walletData[0].user_id;
      return this.getUserPersonas(userId);
    }
    
    // If we can't find through wallet_addresses, try direct query on personas
    // This is a fallback for development mode
    const { data: personasByWallet, error: personaError } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .ilike('wallet_address', normalizedWallet);
    
    if (personaError) {
      console.error('Error fetching personas by wallet:', personaError);
      return [];
    }
    
    return personasByWallet || [];
  }
  
  /**
   * Get active persona by wallet address
   * This is a development mode workaround for the auth system issue
   */
  static async getActivePersonaByWallet(walletAddress: string): Promise<Persona | null> {
    if (!walletAddress) return null;
    
    const normalizedWallet = walletAddress.toLowerCase();
    console.log('[PersonaService] Looking for active persona with wallet:', normalizedWallet);
    
    // In development mode, directly query the dev_personas table
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .eq('wallet_address', normalizedWallet)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('[PersonaService] Error fetching active persona by wallet:', error);
      return null;
    }
    
    if (data) {
      console.log('[PersonaService] Found existing active persona:', data.id);
    } else {
      console.log('[PersonaService] No active persona found for wallet:', normalizedWallet);
    }
    
    return data;
  }
  
  /**
   * Create a new persona
   */
  static async createPersona(
    userId: string, 
    name: string, 
    values: PersonaValues, 
    isActive: boolean = false
  ): Promise<Persona> {
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .insert({ 
        user_id: userId,
        name,
        risk: values.risk,
        esg: values.esg,
        treasury: values.treasury,
        horizon: values.horizon,
        frequency: values.frequency,
        is_active: isActive
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating persona:', error);
      throw error;
    }
    
    // If this is active, deactivate other personas
    if (isActive) {
      await supabase
        .from(isDevelopmentMode ? 'dev_personas' : 'personas')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', data.id);
    }
    
    return data;
  }
  
  /**
   * Create a new persona with wallet address
   * This is a development mode workaround for the auth system issue
   */
  static async createPersonaWithWallet(
    walletAddress: string,
    name: string,
    values: PersonaValues,
    isActive: boolean = false
  ): Promise<Persona> {
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    const normalizedWallet = walletAddress.toLowerCase();
    console.log('[PersonaService] Creating persona with wallet:', normalizedWallet, 'Values:', values);
    
    // First, check if we already have an existing persona for this wallet
    const existingPersonas = await this.getPersonasByWallet(normalizedWallet);
    
    if (existingPersonas.length > 0) {
      console.log('[PersonaService] Found existing personas for wallet, updating first one:', existingPersonas[0].id);
      // If the wallet already has personas, update the first one instead
      return this.updatePersonaWithWallet(
        existingPersonas[0].id,
        normalizedWallet,
        name,
        values,
        isActive
      );
    }
    
    // If we need to create a new one, proceed with insertion
    const timestamp = new Date().toISOString();
    
    try {
      // Try to create persona with standard structure first
      const insertData = { 
        user_id: crypto.randomUUID(),
        name,
        risk: values.risk,
        esg: values.esg,
        treasury: values.treasury,
        horizon: values.horizon,
        frequency: values.frequency,
        is_active: isActive,
        wallet_address: normalizedWallet,
        created_at: timestamp,
        updated_at: timestamp
      };
      
      const { data, error } = await supabase
        .from(isDevelopmentMode ? 'dev_personas' : 'personas')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        // If the error is about user_id column, try again without it
        if (error.message && error.message.includes('user_id')) {
          console.log('[PersonaService] Schema error, trying without user_id field');
          
          // Remove user_id from the data
          const { user_id, ...dataWithoutUserId } = insertData;
          
          const { data: dataNoUserId, error: errorNoUserId } = await supabase
            .from(isDevelopmentMode ? 'dev_personas' : 'personas')
            .insert(dataWithoutUserId)
            .select()
            .single();
            
          if (errorNoUserId) {
            console.error('[PersonaService] Second attempt also failed:', errorNoUserId);
            throw errorNoUserId;
          }
          
          return dataNoUserId;
        } else {
          console.error('[PersonaService] Error creating persona with wallet:', error);
          throw error;
        }
      }
      
      console.log('[PersonaService] Successfully created persona with wallet:', data.id);
      return data;
    } catch (error) {
      console.error('[PersonaService] Critical error creating persona:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing persona
   */
  static async updatePersona(
    personaId: string, 
    name: string, 
    values: PersonaValues, 
    isActive: boolean = false
  ): Promise<Persona> {
    const { data: existingPersona, error: findError } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('user_id')
      .eq('id', personaId)
      .single();
    
    if (findError) {
      console.error('Error finding persona:', findError);
      throw findError;
    }
    
    const userId = existingPersona.user_id;
    
    const { data, error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .update({ 
        name,
        risk: values.risk,
        esg: values.esg,
        treasury: values.treasury,
        horizon: values.horizon,
        frequency: values.frequency,
        is_active: isActive
      })
      .eq('id', personaId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating persona:', error);
      throw error;
    }
    
    // If this is active, deactivate other personas
    if (isActive) {
      await supabase
        .from(isDevelopmentMode ? 'dev_personas' : 'personas')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', personaId);
    }
    
    return data;
  }
  
  /**
   * Update an existing persona with wallet address
   * This is a development mode workaround for the auth system issue
   */
  static async updatePersonaWithWallet(
    personaId: string,
    walletAddress: string,
    name: string,
    values: PersonaValues,
    isActive: boolean = false
  ): Promise<Persona> {
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    const normalizedWallet = walletAddress.toLowerCase();
    console.log('[PersonaService] Updating persona with wallet:', normalizedWallet, 'ID:', personaId, 'Values:', values);
    
    // First verify the persona exists
    const { data: existingPersona, error: findError } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .select('*')
      .eq('id', personaId)
      .maybeSingle();
    
    if (findError || !existingPersona) {
      console.error('[PersonaService] Error finding persona for update:', findError);
      
      // If the persona doesn't exist, create a new one instead
      console.log('[PersonaService] Persona not found, creating new one instead');
      return this.createPersonaWithWallet(
        normalizedWallet,
        name,
        values,
        isActive
      );
    }
    
    const timestamp = new Date().toISOString();
    
    try {
      // Prepare update data
      const updateData = { 
        name,
        risk: values.risk,
        esg: values.esg,
        treasury: values.treasury,
        horizon: values.horizon,
        frequency: values.frequency,
        is_active: isActive,
        updated_at: timestamp,
        wallet_address: normalizedWallet
      };
      
      const { data, error } = await supabase
        .from(isDevelopmentMode ? 'dev_personas' : 'personas')
        .update(updateData)
        .eq('id', personaId)
        .select()
        .single();
      
      if (error) {
        console.error('[PersonaService] Error updating persona with wallet:', error);
        throw error;
      }
      
      console.log('[PersonaService] Successfully updated persona:', data.id);
      
      // If this is active, deactivate other personas with the same wallet
      if (isActive) {
        const { error: deactivateError } = await supabase
          .from(isDevelopmentMode ? 'dev_personas' : 'personas')
          .update({ is_active: false })
          .eq('wallet_address', normalizedWallet)
          .neq('id', personaId);
        
        if (deactivateError) {
          console.error('[PersonaService] Error deactivating other personas:', deactivateError);
        }
      }
      
      return data;
    } catch (error) {
      console.error('[PersonaService] Error in update persona flow:', error);
      throw error;
    }
  }
  
  /**
   * Delete a persona
   */
  static async deletePersona(personaId: string): Promise<void> {
    const { error } = await supabase
      .from(isDevelopmentMode ? 'dev_personas' : 'personas')
      .delete()
      .eq('id', personaId);
    
    if (error) {
      console.error('Error deleting persona:', error);
      throw error;
    }
  }
  
  /**
   * Create default persona for new users
   */
  static async createDefaultPersona(userId: string): Promise<Persona> {
    return this.createPersona(
      userId,
      'Default Persona',
      {
        risk: 50,
        esg: 50,
        treasury: 50,
        horizon: 50,
        frequency: 10
      },
      true // Set as active
    );
  }
}
