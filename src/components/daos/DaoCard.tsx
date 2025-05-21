import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { type Dao } from "./DaoCardGrid";
import { DaoService } from "@/lib/services/dao.service";
import { GooeyFilter } from "@/components/ui/liquid-toggle";
import { useAuth } from "@/context/AuthContext";
import { AgentSetupModal } from "@/components/modals/AgentSetupModal";
import { useToast } from "@/components/ui/use-toast";
import { AgentKitService } from "@/lib/services/agent-kit.service";
import { supabase } from "@/lib/supabase";

interface DaoCardProps {
  dao: Dao;
}

const DaoCard = ({ dao }: DaoCardProps) => {
  const [proposalCount, setProposalCount] = useState<number>(dao.proposal_count || 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State for controlling the SimpleAgentModal
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [autoVoteEnabled, setAutoVoteEnabled] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true); // Start with checking

  const { toast } = useToast();
  const { user, wallet } = useAuth();

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Clean up any subscriptions or async tasks
      setCheckingStatus(false);
      setIsLoading(false);
      setAutoVoteEnabled(false);
    };
  }, []);

  // Check auto-vote status on load
  useEffect(() => {
    const checkAutoVoteStatus = async () => {
      if (!user?.id || !wallet) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        console.log(`Checking auto-vote status for dao ${dao.id} and user ${user.id}...`);
        
        // Use the AgentKitService to check status, which uses the admin client with service role key
        const hasAutoVote = await AgentKitService.checkAutoVoteStatus(user.id, dao.id);
        console.log(`Auto-vote status for ${dao.name}: ${hasAutoVote}`);
        
        setAutoVoteEnabled(hasAutoVote);
      } catch (error) {
        console.error('Error checking auto-vote status:', error);
        setAutoVoteEnabled(false);
      } finally {
        setCheckingStatus(false);
      }
    };
    
    checkAutoVoteStatus();
  }, [user?.id, wallet, dao.id, dao.name]);

  // Directly fetch accurate proposal count for this card
  useEffect(() => {
    let isMounted = true;

    const fetchProposalCount = async () => {
      setIsLoading(true);
      try {
        // Use the correct method name
        const result = await DaoService.getProposalCounts(dao.id);
        if (result?.proposalCount !== undefined) {
          setProposalCount(result.proposalCount);
        }
      } catch (error) {
        console.error('Error fetching proposal count:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProposalCount();
  }, [dao.id]);
  
  // Ensure checking status is reset when component unmounts
  useEffect(() => {
    return () => {
      setCheckingStatus(false);
    };
  }, []);
  
  // Handle successful agent setup
  const handleAgentSetupSuccess = (agentId: string) => {
    console.log(`Agent setup success with ID: ${agentId}`);
    setAutoVoteEnabled(true);
  };
  
  // Open the agent setup modal
  const handleOpenModal = () => {
    console.log('Opening agent setup modal');
    setShowAgentModal(true);
  };
  
  // Handle disabling auto-vote
  const handleDisableAutoVote = async () => {
    if (!user?.id || !wallet) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to use this feature.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCheckingStatus(true);
      const walletAddress = wallet.toLowerCase();
      
      console.log(`Disabling auto-vote for DAO ${dao.id} with wallet ${walletAddress}`);
      await AgentKitService.disableAutoVote(user.id, dao.id, walletAddress);
      
      // Update UI
      setAutoVoteEnabled(false);
      toast({
        title: "Auto-Vote Disabled",
        description: `Auto-voting has been disabled for ${dao.name}.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error disabling auto-vote:', error);
      // Still update UI
      setAutoVoteEnabled(false);
      toast({
        title: "Auto-Vote Status Changed",
        description: `Auto-voting has been disabled for ${dao.name}.`,
        variant: "default"
      });
    } finally {
      setCheckingStatus(false);
    }
  };
  
  return (
    <>
      {/* Agent Setup Modal */}
      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        daoId={dao.id}
        daoName={dao.name}
        onSuccess={handleAgentSetupSuccess}
      />
      
      <GooeyFilter />
      <CardSpotlight 
        className="border-silver/10 overflow-hidden transition-all hover:border-silver/20 h-full"
        radius={250}
        color="#1A1F2C"
      >
        {/* Adding a relative container with z-index to ensure content stays on top */}
        <div className="p-6 flex flex-col h-full relative z-10">
          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0">
              {dao.logo_url ? (
                <div className="w-16 h-16 rounded-full bg-black/30 overflow-hidden flex items-center justify-center border border-silver/10">
                  <img 
                    src={dao.logo_url} 
                    alt={`${dao.name} logo`} 
                    className="w-14 h-14 object-contain" 
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-indigo">
                    {dao.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent">{dao.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  className={`
                    ${dao.platform === 'Base' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 
                     dao.platform === 'Ethereum' ? 'bg-indigo/20 text-indigo hover:bg-indigo/30' : 
                     'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}
                    border border-white/5
                  `}
                >
                  {dao.platform || 'Unknown Chain'}
                </Badge>
                
                {dao.your_delegation_pct > 0 && (
                  <Badge className="bg-cyan/20 text-cyan hover:bg-cyan/30 border border-white/5">
                    Delegated
                  </Badge>
                )}
                
                {dao.is_base_ecosystem && (
                  <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-white/5">
                    Base
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-graphite/20 backdrop-blur-md rounded-xl p-4 mb-5 border border-silver/5">
            <p className="text-silver text-sm line-clamp-2">
              {dao.description || "A decentralized autonomous organization with on-chain governance."}
            </p>
          </div>
          
          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm">
                {isLoading ? (
                  <span className="text-silver">Loading...</span>
                ) : (
                  <>
                    <span className="text-phosphor font-medium">{proposalCount}</span>{" "}
                    <span className="text-silver">
                      {proposalCount === 1 ? "Proposal" : "Proposals"}
                    </span>
                  </>
                )}
              </span>
            </div>
            
            {dao.your_delegation_pct > 0 && (
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    stroke="#2A303C" 
                    strokeWidth="2" 
                  />
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    stroke="#5FFBF1" 
                    strokeWidth="3" 
                    strokeDasharray={`${dao.your_delegation_pct * 0.01 * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
                    strokeLinecap="round"
                  />
                  <text 
                    x="18" 
                    y="18" 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    fill="#5FFBF1" 
                    fontSize="8" 
                    fontWeight="bold"
                  >
                    {dao.your_delegation_pct}%
                  </text>
                </svg>
              </div>
            )}
          </div>
          
          {/* Auto-Vote Feature Section */}
          <div className="mt-4 pt-4 border-t border-silver/10 flex items-center justify-between">
            <span className="text-silver text-sm">Auto-Vote with AI</span>
            {checkingStatus ? (
              <div className="text-xs text-indigo px-2 py-1 rounded bg-indigo/10 border border-indigo/20">
                <span className="animate-pulse">Checking...</span>
              </div>
            ) : autoVoteEnabled ? (
              <button 
                onClick={handleDisableAutoVote}
                className="text-xs text-green-400 px-2 py-1 rounded bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-colors"
              >
                Enabled
              </button>
            ) : (
              <button 
                onClick={handleOpenModal}
                className="text-xs text-indigo px-2 py-1 rounded bg-indigo/10 border border-indigo/20 hover:bg-indigo/20 transition-colors"
              >
                Setup
              </button>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-silver/10">
            <Link 
              to={`/dao/${dao.id}`}
              className="text-indigo hover:text-cyan text-sm font-medium flex items-center justify-center w-full py-2.5 rounded-lg border border-indigo/30 hover:border-cyan/50 transition-colors bg-black/20 hover:bg-black/40"
            >
              View Proposals →
            </Link>
          </div>
        </div>
      </CardSpotlight>
    </>
  );
};

export default DaoCard;
