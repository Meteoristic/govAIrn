import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { type Dao } from "./DaoCardGrid";
import { DaoService } from "@/lib/services/dao.service";
import { GooeyFilter } from "@/components/ui/liquid-toggle";
import { useAuth } from "@/context/AuthContext";

interface DaoCardProps {
  dao: Dao;
}

const DaoCard = ({ dao }: DaoCardProps) => {
  const [proposalCount, setProposalCount] = useState<number>(dao.proposal_count || 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  
  // Directly fetch accurate proposal count for this card
  useEffect(() => {
    let isMounted = true;
    
    const fetchProposalCount = async () => {
      try {
        setIsLoading(true);
        // Use the dedicated method to get accurate proposal counts
        const result = await DaoService.getProposalCounts(dao.id);
        
        if (isMounted) {
          console.log(`DaoCard: Setting proposal count for ${dao.id} to ${result.proposalCount}`);
          setProposalCount(result.proposalCount);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Error fetching proposal count for ${dao.id}:`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchProposalCount();
    
    return () => {
      isMounted = false;
    };
  }, [dao.id]);

  return (
    <>
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
          
          {/* Future Feature Section */}
          <div className="mt-4 pt-4 border-t border-silver/10 flex items-center justify-between">
            <span className="text-silver text-sm">Coming Soon</span>
            <span className="text-xs text-indigo px-2 py-1 rounded bg-indigo/10 border border-indigo/20">Beta</span>
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
