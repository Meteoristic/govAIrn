import React, { useState, useEffect } from "react";
import DaoCard from "./DaoCard";
import { useAuth } from "@/context/AuthContext";
import { DaoService, type Dao as DaoType } from "@/lib/services/dao.service";

// Using our existing interface to maintain backward compatibility
export interface Dao {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  logo_url?: string;
  proposal_count?: number;
  your_delegation_pct?: number; 
  is_base_ecosystem?: boolean;
}

interface DaoCardGridProps {
  searchQuery: string;
  filter: string;
}

const DaoCardGrid = ({ searchQuery, filter }: DaoCardGridProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daos, setDaos] = useState<Dao[]>([]);
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    const fetchDaos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Immediately fetch and display DAOs from the database first
        const allDaos: Dao[] = await DaoService.getAllDaos();
        
        // Show the DAOs to the user immediately while we update in the background
        setDaos(allDaos);
        setLoading(false);
        
        // Create a map to store proposal counts by DAO ID
        const proposalCountsMap = new Map<string, number>();
        
        // Now update the DAO info in the background without blocking the UI
        const updatePromises = allDaos.map(async (dao) => {
          try {
            // Use the enhanced service to get accurate proposal counts
            const result = await DaoService.updateDAOWithAccurateInfo(dao.id);
            console.log(`Updated DAO ${dao.id} with proposal count: ${result.proposalCount}`);
            proposalCountsMap.set(dao.id, result.proposalCount);
          } catch (err) {
            console.error(`Error updating DAO ${dao.id}:`, err);
          }
        });
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        // Refresh the DAOs after updates
        const refreshedDaos = await DaoService.getAllDaos();
        
        // Apply the proposal counts to the refreshed DAOs
        const daosWithProposalCounts = refreshedDaos.map(dao => {
          const proposalCount = proposalCountsMap.get(dao.id);
          console.log(`Setting proposal count for ${dao.id}: ${proposalCount}`);
          return {
            ...dao,
            proposal_count: proposalCount || 0
          };
        });
        
        // If user is authenticated, add delegation info
        if (isAuthenticated && user) {
          const userDelegations = await DaoService.getUserDelegations(user.id);
          
          // Map delegations to DAOs
          const daosWithDelegation = daosWithProposalCounts.map(dao => {
            const delegation = userDelegations.find(d => d.dao_id === dao.id);
            return {
              ...dao,
              your_delegation_pct: delegation ? delegation.delegation_pct : 0
            };
          });
          
          setDaos(daosWithDelegation);
        } else {
          setDaos(daosWithProposalCounts);
        }
        
      } catch (err) {
        console.error('Error fetching DAOs:', err);
        setError('Failed to load DAOs. Please try again.');
        setLoading(false);
      }
    };
    
    fetchDaos();
  }, [user, isAuthenticated]);
  
  // Filter the DAOs based on search query and selected filter
  const filteredDaos = daos.filter(dao => {
    // Filter by search query
    if (searchQuery && !dao.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Apply additional filters
    if (filter === "delegated" && (!dao.your_delegation_pct || dao.your_delegation_pct === 0)) {
      return false;
    }
    
    if (filter === "active" && (!dao.proposal_count || dao.proposal_count === 0)) {
      return false;
    }
    
    if (filter === "high-activity" && (!dao.proposal_count || dao.proposal_count < 10)) {
      return false;
    }
    
    if (filter === "base" && dao.platform !== "Base") {
      return false;
    }
    
    return true;
  });
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-phosphor">Loading DAOs...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 flex-col gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo/20 text-indigo rounded-xl border border-indigo/30"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (filteredDaos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-silver mb-4">No DAOs found. Try connecting your wallet or exploring public DAOs.</p>
        <button 
          className="px-4 py-2 bg-indigo/20 text-indigo rounded-xl border border-indigo/30 hover:bg-indigo/30 transition-colors"
          onClick={() => window.location.href = '/dao/aero'}
        >
          Explore Demo DAO
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredDaos.map((dao) => (
        <DaoCard key={dao.id} dao={dao} />
      ))}
    </div>
  );
};

export default DaoCardGrid;
