import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import ProposalFeed from "@/components/dashboard/ProposalFeed";
import { type Dao } from "@/components/daos/DaoCardGrid";
import { DaoService } from "@/lib/services/dao.service";

const DaoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [dao, setDao] = useState<Dao | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDao = async () => {
      setLoading(true);
      try {
        if (!id) {
          console.error("No DAO ID provided");
          return;
        }
        
        // Fetch the real DAO from the database
        const foundDao = await DaoService.getDaoById(id);
        
        if (foundDao) {
          setDao(foundDao);
        } else {
          console.error(`DAO with id ${id} not found`);
        }
      } catch (error) {
        console.error("Error fetching DAO:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDao();
  }, [id]);
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-phosphor">Loading DAO information...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!dao) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-phosphor mb-6">DAO Not Found</h1>
          <p className="text-silver">The DAO you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-8 p-6 relative">
        {/* Background gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
      
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 grid-pattern opacity-10"></div>
        
        {/* DAO header */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-silver/10 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="shrink-0">
              {dao.logo_url ? (
                <img 
                  src={dao.logo_url} 
                  alt={`${dao.name} logo`} 
                  className="w-20 h-20 rounded-full bg-black/30 object-contain p-2" 
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-indigo">
                    {dao.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-phosphor">{dao.name}</h1>
                <Badge 
                  className={`
                    ${dao.platform === 'Base' ? 'bg-blue-500/20 text-blue-400' : 
                     dao.platform === 'Ethereum' ? 'bg-indigo/20 text-indigo' : 
                     'bg-gray-500/20 text-gray-400'}
                    border border-white/5 self-center md:self-auto
                  `}
                >
                  {dao.platform || 'Unknown Chain'}
                </Badge>
              </div>
              
              <p className="text-silver mb-4">
                {dao.description || "A decentralized autonomous organization with on-chain governance."}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="text-center bg-black/20 rounded-lg px-4 py-2 border border-silver/10">
                  <p className="text-sm text-silver">Proposals</p>
                  <p className="text-xl font-medium text-phosphor">{dao.proposal_count || 0}</p>
                </div>
                
                <div className="text-center bg-black/20 rounded-lg px-4 py-2 border border-silver/10">
                  <p className="text-sm text-silver">Voter Turnout</p>
                  <p className="text-xl font-medium text-phosphor">{Math.floor(Math.random() * 40) + 40}%</p>
                </div>
                
                <div className="text-center bg-black/20 rounded-lg px-4 py-2 border border-silver/10">
                  <p className="text-sm text-silver">Top Delegates</p>
                  <p className="text-xl font-medium text-phosphor">{Math.floor(Math.random() * 10) + 5}</p>
                </div>
                
                {dao.your_delegation_pct > 0 && (
                  <div className="text-center bg-cyan/10 rounded-lg px-4 py-2 border border-cyan/20">
                    <p className="text-sm text-cyan">Your Delegation</p>
                    <p className="text-xl font-medium text-cyan">{dao.your_delegation_pct}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-phosphor mt-4">Proposals</h2>
        
        <div className="animate-fade-in">
          <ProposalFeed />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DaoDetail;
