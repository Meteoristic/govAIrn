import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from 'wagmi';

export const useAuthModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requiredFeature, setRequiredFeature] = useState<string | undefined>(undefined);
  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();
  
  const openAuthModal = useCallback((feature?: string) => {
    setRequiredFeature(feature);
    setIsModalOpen(true);
  }, []);
  
  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
    setRequiredFeature(undefined);
  }, []);
  
  // Check if a user can access a feature that requires authentication
  const checkAuthAccess = useCallback((feature?: string): boolean => {
    const hasAccess = isAuthenticated || isConnected;
    
    if (!hasAccess && feature) {
      openAuthModal(feature);
    }
    
    return hasAccess;
  }, [isAuthenticated, isConnected, openAuthModal]);

  return {
    isModalOpen,
    requiredFeature,
    openAuthModal,
    closeAuthModal,
    checkAuthAccess,
    isAuthenticated,
    isConnected
  };
}; 