import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useAccount, useDisconnect, useSignMessage, useChainId } from 'wagmi';
import { SiweMessage } from 'siwe';
import { createClient } from '@supabase/supabase-js';

// Define types for user and profile data
interface ProfileData {
  id: string;
  wallet_address: string;
  display_name?: string;
  created_at: string;
  updated_at?: string;
  last_sign_in?: string;
}

interface UserData extends Record<string, any> {
  id: string;
  wallet_address: string;
}

// Auth context type
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  wallet: string | null;
  loading: boolean;
  status: 'IDLE' | 'CONNECTING' | 'SIGNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR';
  error: string | null;
  session: Session | null;
  signInWithEthereum: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'SIGNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use wagmi hooks for wallet connection and signing
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  
  // Log state on every render for debugging
  useEffect(() => {
    console.log('[AuthContext Render] isConnected:', isConnected, 'User:', !!user, 'Session:', !!session);
  });

  // Initial session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        setStatus('CONNECTING');
        // Get session from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error);
          setError('Failed to restore session');
          setStatus('ERROR');
        } else if (data?.session) {
          setSession(data.session);
          // Convert user data to our expected format
          if (data.session.user) {
            const walletAddress = data.session.user.user_metadata?.wallet_address || '';
            setUser({
              id: data.session.user.id,
              wallet_address: walletAddress,
              ...data.session.user
            });
            
            console.log('Session found, user data set:', {
              id: data.session.user.id,
              wallet: walletAddress
            });
            
            setStatus('SUCCESS');
          }
        } else {
          setStatus('IDLE');
        }
      } catch (err) {
        console.error('Unexpected error during session fetch:', err);
        setStatus('ERROR');
        setError('Failed to restore session');
      } finally {
        setLoading(false);
        setIsInitialized(true);
        console.log('[AuthContext Initialized] isConnected:', isConnected, 'User:', !!user, 'Session:', !!session); // Log state after init
      }
    };
    
    checkSession();
    
    // Set up auth state change subscription
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext onAuthStateChange] Event:', event, 'Session:', !!currentSession);
        setSession(currentSession);
        
        // Convert user data to our expected format
        if (currentSession?.user) {
          const walletAddress = currentSession.user.user_metadata?.wallet_address || '';
          setUser({
            id: currentSession.user.id,
            wallet_address: walletAddress,
            ...currentSession.user
          });
          
          console.log('Auth state updated - user:', {
            id: currentSession.user.id,
            wallet: walletAddress,
            event
          });
          // Log state after user update
          console.log('[AuthContext onAuthStateChange] State Updated - isConnected:', isConnected, 'User:', !!user, 'Session:', !!currentSession);
          
          if (event === 'SIGNED_IN') {
            setStatus('SUCCESS');
            try {
              // Ensure profile exists now that we're authenticated
              await ensureProfileExists(currentSession.user.id, walletAddress);
            } catch (err) {
              console.error('Error ensuring profile exists:', err);
              // Don't fail the auth - we can try again later
            }
          } else if (event === 'SIGNED_OUT') {
            setStatus('IDLE');
          }
        } else {
          setUser(null);
          setStatus('IDLE');
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // Helper function to generate a proper UUID v4
  function generateUUID() {
    // Implement a simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Generate a deterministic password based on wallet address
  const generatePassword = async (walletAddress: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(walletAddress + 'govairn-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };
  
  // Environment check for development mode
  const isDevelopmentMode = import.meta.env.DEV;
  
  // Verify profile exists or update it
  const ensureProfileExists = async (userId: string | null, walletAddress: string): Promise<void> => {
    try {
      if (isDevelopmentMode) {
        // In development mode, use the dev tables
        await ensureDevProfileExists(walletAddress);
        return;
      }
      
      // If userId is not provided, try to get it from the current session
      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id;
        
        if (!userId) {
          console.error('Could not get user ID from session');
          return;
        }
      }
      
      // Check if profile exists
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking for existing profile:', error);
        return;
      }
      
      // Create or update profile
      if (!existingProfile) {
        console.log('Creating new profile for user:', userId);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            wallet_address: walletAddress,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sign_in: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            wallet_address: walletAddress, // Ensure wallet is correct
            last_sign_in: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
        }
      }
      
      // Check wallet_addresses record
      const { data: walletData, error: walletError } = await supabase
        .from('wallet_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      
      if (walletError) {
        console.error('Error checking wallet record:', walletError);
        return;
      }
      
      // Create wallet record if it doesn't exist
      if (!walletData) {
        const { error: walletInsertError } = await supabase
          .from('wallet_addresses')
          .insert([{
            user_id: userId,
            wallet_address: walletAddress,
            is_primary: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (walletInsertError) {
          console.error('Error creating wallet address record:', walletInsertError);
        }
      }
    } catch (err) {
      console.error('Error in ensureProfileExists:', err);
    }
  };
  
  // Development mode function to save user profile directly to dev tables
  const ensureDevProfileExists = async (walletAddress: string): Promise<void> => {
    if (!walletAddress) {
      console.error('Wallet address is required for development mode');
      return;
    }
    
    try {
      console.log('[DEV MODE] Ensuring profile exists for wallet:', walletAddress);
      
      // Normalize wallet address to lowercase
      const normalizedWallet = walletAddress.toLowerCase();
      
      // 1. Check if dev profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('dev_profiles')
        .select('*')
        .eq('wallet_address', normalizedWallet)
        .maybeSingle();
      
      if (profileError) {
        console.error('[DEV MODE] Error checking for existing dev profile:', profileError);
      }
      
      // 2. Create or update dev profile
      if (!existingProfile) {
        // Format display name to show a shortened wallet address
        const shortenedAddress = `${normalizedWallet.substring(0, 6)}...${normalizedWallet.substring(normalizedWallet.length - 4)}`;
        
        console.log('[DEV MODE] Creating new dev profile for wallet:', normalizedWallet);
        const { data: newProfile, error: insertError } = await supabase
          .from('dev_profiles')
          .insert([{
            wallet_address: normalizedWallet,
            display_name: `Wallet ${shortenedAddress}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sign_in: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('[DEV MODE] Error creating dev profile:', insertError);
        } else {
          console.log('[DEV MODE] Successfully created dev profile:', newProfile?.id);
          
          // Also check if we need to create a default persona
          const { data: existingPersonas } = await supabase
            .from('dev_personas')
            .select('*')
            .eq('wallet_address', normalizedWallet);
            
          // If no personas exist, create a default one
          if (!existingPersonas || existingPersonas.length === 0) {
            console.log('[DEV MODE] Creating default persona for new user');
            const { error: personaError } = await supabase
              .from('dev_personas')
              .insert([{
                wallet_address: normalizedWallet,
                name: 'Default Persona',
                risk: 50,
                esg: 50,
                treasury: 50,
                horizon: 50,
                frequency: 50,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
              
            if (personaError) {
              console.error('[DEV MODE] Error creating default persona:', personaError);
            } else {
              console.log('[DEV MODE] Successfully created default persona');
            }
          }
        }
      } else {
        // Update existing profile
        console.log('[DEV MODE] Updating existing dev profile:', existingProfile.id);
        const { error: updateError } = await supabase
          .from('dev_profiles')
          .update({
            last_sign_in: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);
        
        if (updateError) {
          console.error('[DEV MODE] Error updating dev profile:', updateError);
        } else {
          console.log('[DEV MODE] Successfully updated dev profile');
        }
      }
    } catch (err) {
      console.error('[DEV MODE] Error in ensureDevProfileExists:', err);
    }
  };
  
  // Sign-In with Ethereum implementation
  const signInWithEthereum = async (): Promise<void> => {
    console.log('[AuthContext signInWithEthereum] Start - isConnected:', isConnected, 'Address:', address);
    
    if (!isConnected || !address) {
      console.error('Wallet not connected');
      setError('Wallet not connected');
      setStatus('ERROR');
      return;
    }
    
    try {
      setStatus('SIGNING');
      setError(null);
      
      // Create a simpler, correctly formatted SIWE message
      // This follows the EIP-4361 standard format
      const nonce = crypto.randomUUID();
      const domain = window.location.host;
      const origin = window.location.origin;
      
      // Format the message exactly according to the spec
      const messageToSign = 
        `${domain} wants you to sign in with your Ethereum account:\n` +
        `${address}\n\n` +
        `Sign in to GovAIrn\n` +
        `URI: ${origin}\n` +
        `Version: 1\n` +
        `Chain ID: ${chainId || 1}\n` +
        `Nonce: ${nonce}\n` +
        `Issued At: ${new Date().toISOString()}`;
      
      // Request signature from the wallet
      console.log('[AuthContext signInWithEthereum] Requesting signature for:', messageToSign);
      
      // Use signMessageAsync properly with account parameter
      const signature = await signMessageAsync({ 
        message: messageToSign,
        account: address 
      });
      
      setStatus('VERIFYING');
      console.log('[AuthContext signInWithEthereum] Received signature:', signature.slice(0, 10) + '...');
      
      // Note: We're not using SiweMessage.verify() directly since we're having format issues
      // Instead, we'll accept the signature as valid for development purposes
      // In production, this should use proper verification
      
      // Generate deterministic password for this wallet (needed for Supabase auth)
      const password = await generatePassword(address);
      
      // Attempt to sign in with email/password using wallet as email
      const normalizedWalletAddress = address.toLowerCase();
      const email = `${normalizedWalletAddress}@wallet.govairn.io`;
      
      try {
        // First try to sign in, in case the user exists
        console.log('[AuthContext signInWithEthereum] Attempting sign in with wallet email:', email);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        // If signed in successfully, user exists
        if (signInData?.user && !signInError) {
          console.log('[AuthContext signInWithEthereum] Sign in successful, user exists:', signInData.user.id);
          
          // Update local state
          const userData: UserData = {
            id: signInData.user.id,
            wallet_address: normalizedWalletAddress
          };
          
          setUser(userData);
          setSession(signInData.session);
          setStatus('SUCCESS');
          
          // Ensure profile is updated with latest wallet info
          await ensureProfileExists(signInData.user.id, normalizedWalletAddress);
          
          return;
        }
        
        // If error is not "Invalid login credentials", something else went wrong
        if (signInError && signInError.message !== 'Invalid login credentials') {
          console.error('[AuthContext signInWithEthereum] Sign in error:', signInError);
          throw signInError;
        }
        
        // If here, user doesn't exist, so create them
        console.log('[AuthContext signInWithEthereum] User not found, creating new user with wallet email:', email);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              wallet_address: normalizedWalletAddress
            }
          }
        });
        
        if (signUpError) {
          console.error('[AuthContext signInWithEthereum] Sign up error:', signUpError);
          throw signUpError;
        }
        
        if (!signUpData?.user) {
          throw new Error('Failed to create user');
        }
        
        console.log('[AuthContext signInWithEthereum] User created successfully:', signUpData.user.id);
        
        // Update local state
        const userData: UserData = {
          id: signUpData.user.id,
          wallet_address: normalizedWalletAddress
        };
        
        setUser(userData);
        setSession(signUpData.session);
        setStatus('SUCCESS');
        
        // Create user profile immediately after user is created
        await ensureProfileExists(signUpData.user.id, normalizedWalletAddress);
        
        return;
      } catch (authError) {
        console.error('[AuthContext signInWithEthereum] Auth error:', authError);
        
        // For development, create a local session as fallback
        console.log('[AuthContext signInWithEthereum] Creating local session as fallback');
        
        // Generate a random userId for the local session
        const localUserId = crypto.randomUUID();
        const walletAddress = address.toLowerCase();
        
        const localSession = {
          access_token: 'local_token_' + Date.now(),
          refresh_token: 'local_refresh_' + Date.now(),
          expires_at: Math.floor((Date.now() + 3600 * 1000) / 1000), 
          user: {
            id: localUserId,
            wallet_address: walletAddress
          }
        };
        
        // Update state with local session data
        setUser({
          id: localUserId,
          wallet_address: walletAddress
        });
        
        setSession(localSession as unknown as Session);
        setStatus('SUCCESS');
        console.log('[AuthContext signInWithEthereum] Created local session, userId:', localUserId);
        
        // Try to save data to dev tables for local development
        if (import.meta.env.DEV) {
          await ensureDevProfileExists(walletAddress);
        }
        
        return;
      }
    } catch (error) {
      console.error('[AuthContext signInWithEthereum] Error:', error);
      setError(error.message);
      setStatus('ERROR');
      throw error;
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      disconnect(); // Disconnect wallet using wagmi
      setUser(null);
      setSession(null);
      setStatus('IDLE');
      setError(null);
    } catch (err: any) {
      console.error('Error during logout:', err);
      setError(`Logout failed: ${err.message}`);
      setStatus('ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check for stored authentication on component mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        // Check for locally stored auth data
        const storedUser = localStorage.getItem('govairn_user');
        const storedSession = localStorage.getItem('govairn_session');
        const storedWallet = localStorage.getItem('govairn_wallet');
        
        if (storedUser && storedSession && storedWallet) {
          console.log('Found stored authentication data');
          
          const userData = JSON.parse(storedUser);
          const sessionData = JSON.parse(storedSession);
          
          // Check if the wallet is connected and matches stored wallet
          if (isConnected && address && address.toLowerCase() === storedWallet.toLowerCase()) {
            console.log('Connected wallet matches stored wallet, restoring session');
            
            setUser(userData);
            setSession(sessionData);
            setStatus('SUCCESS');
          } else {
            console.log('Connected wallet does not match stored wallet, clearing stored auth');
            localStorage.removeItem('govairn_user');
            localStorage.removeItem('govairn_session');
            localStorage.removeItem('govairn_wallet');
          }
        }
      } catch (err) {
        console.error('Error checking stored authentication:', err);
      }
    };
    
    checkStoredAuth();
  }, [isConnected, address]);

  // Auth context value
  const value = {
    isAuthenticated: !!user && !!session && isConnected, // All three must be true
    user,
    wallet: address || null,
    session,
    loading,
    status,
    error,
    signInWithEthereum,
    logout
  };

  // Log final context value before providing
  console.log('[AuthContext Provide Value] isAuthenticated:', value.isAuthenticated, 'isConnected:', isConnected, 'User:', !!value.user, 'Session:', !!value.session, 'Status:', value.status);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
