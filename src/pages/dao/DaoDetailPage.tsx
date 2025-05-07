import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DaoService } from '@/lib/services/dao.service';
import { ProposalService } from '@/lib/services/proposal.service';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { ExternalLink, ChevronRight } from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_time?: string;
  end_time?: string;
  url?: string;
}

export default function DaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dao, setDao] = useState<any>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [proposalCounts, setProposalCounts] = useState<{
    total: number;
    active: number;
    closed: number;
  }>({ total: 0, active: 0, closed: 0 });

  useEffect(() => {
    if (!id) {
      navigate('/daos');
      return;
    }
    
    fetchDaoAndProposals();
  }, [id]);

  const fetchDaoAndProposals = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      setMetricsLoading(true);

      // Get DAO details
      const daoResult = await DaoService.getDAO(id);
      if (daoResult) {
        setDao(daoResult);
        
        // Get accurate proposal counts
        try {
          console.log(`Fetching proposal counts for ${id}`);
          const counts = await DaoService.getProposalCounts(id);
          setProposalCounts({
            total: counts.proposalCount,
            active: counts.activeCount,
            closed: counts.closedCount
          });
          console.log(`Set proposal counts for ${id}: total=${counts.proposalCount}, active=${counts.activeCount}, closed=${counts.closedCount}`);
        } catch (err) {
          console.error('Error fetching proposal counts:', err);
        }
        
        setMetricsLoading(false);
      } else {
        setError('DAO not found');
        return;
      }

      // Get proposals for this DAO
      const proposalsResult = await ProposalService.listProposals({
        daoId: id,
        limit: 20
      });

      if (proposalsResult && proposalsResult.length > 0) {
        setProposals(proposalsResult);
      } else {
        setProposals([]);
      }
    } catch (err) {
      console.error('Error fetching DAO proposals:', err);
      setError('Failed to load proposals for this DAO');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'active') {
      return 'bg-indigo/20 text-indigo';
    } else if (normalizedStatus === 'pending' || normalizedStatus === 'queued') {
      return 'bg-gold/20 text-gold';
    } else if (normalizedStatus === 'executed' || normalizedStatus === 'closed') {
      return 'bg-teal/20 text-teal';
    }
    return 'bg-silver/20 text-silver';
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-1/3 bg-graphite/30" />
              <Skeleton className="h-6 w-1/2 bg-graphite/30" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl bg-graphite/30" />
              ))}
            </div>
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/4 bg-graphite/30" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl bg-graphite/30" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* DAO Header Section */}
            <div className="bg-black/40 rounded-2xl border border-silver/10 overflow-hidden backdrop-blur-md">
              <div className="p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-shrink-0 h-20 w-20 rounded-xl bg-indigo/20 border border-indigo/30 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-indigo">
                    {dao?.name?.charAt(0) || 'D'}
                  </div>
                
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-phosphor bg-clip-text bg-gradient-to-r from-phosphor to-phosphor/80 text-transparent">
                      {dao?.name || 'DAO'}
                    </h1>
                    <p className="text-silver mt-2">
                      {dao?.description || 'No description available for this DAO.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <CardSpotlight className="p-6">
                    <div className="relative z-10 flex flex-col items-center">
                      {metricsLoading ? (
                        <Skeleton className="w-16 h-10 bg-graphite/30" />
                      ) : (
                        <div className="text-3xl font-bold text-phosphor">{proposalCounts.total}</div>
                      )}
                      <div className="text-sm text-silver">Total Proposals</div>
                    </div>
                  </CardSpotlight>
                  
                  <CardSpotlight className="p-6">
                    <div className="relative z-10 flex flex-col items-center">
                      {metricsLoading ? (
                        <Skeleton className="w-16 h-10 bg-graphite/30" />
                      ) : (
                        <div className="text-3xl font-bold text-cyan">{proposalCounts.active}</div>
                      )}
                      <div className="text-sm text-silver">Active Proposals</div>
                    </div>
                  </CardSpotlight>
                  
                  <CardSpotlight className="p-6">
                    <div className="relative z-10 flex flex-col items-center">
                      {metricsLoading ? (
                        <Skeleton className="w-16 h-10 bg-graphite/30" />
                      ) : (
                        <div className="text-3xl font-bold text-indigo">{proposalCounts.closed}</div>
                      )}
                      <div className="text-sm text-silver">Closed Proposals</div>
                    </div>
                  </CardSpotlight>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-phosphor mt-8 mb-4 flex items-center">
              <span className="bg-clip-text bg-gradient-to-r from-phosphor to-phosphor/80 text-transparent">Proposals</span>
              <span className="ml-3 text-sm text-silver font-normal">{proposals.length} found</span>
            </h2>
            
            {error ? (
              <div className="p-6 bg-red-900/20 backdrop-blur-sm text-red-400 rounded-xl border border-red-700/30">
                <p className="mb-4">{error}</p>
                <Button onClick={fetchDaoAndProposals} className="bg-indigo hover:bg-indigo/90">
                  Try Again
                </Button>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center p-12 backdrop-blur-sm bg-graphite/20 border border-silver/10 rounded-xl">
                <p className="text-silver mb-6 text-lg">No proposals found for this DAO</p>
                <Button onClick={fetchDaoAndProposals} className="bg-indigo hover:bg-indigo/90">
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {proposals.map((proposal) => (
                  <CardSpotlight key={proposal.id} className="p-6 hover:border-silver/20 transition-all">
                    <div className="relative z-10 flex flex-col">
                      <h3 className="text-xl font-bold mb-2 text-phosphor">{proposal.title}</h3>
                      <p className="text-silver mb-4 line-clamp-2">
                        {proposal.description
                          ? proposal.description.substring(0, 200) + (proposal.description.length > 200 ? '...' : '')
                          : 'No description available'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusBadgeColor(proposal.status)}>
                            {getStatusLabel(proposal.status)}
                          </Badge>
                          
                          <span className="text-sm text-silver">
                            {proposal.end_time ? `Ends ${formatDate(proposal.end_time)}` : 'No end date'}
                          </span>
                        </div>
                        
                        {proposal.url && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(proposal.url, '_blank')}
                            className="border-indigo/30 hover:border-cyan/50 text-indigo hover:text-cyan flex items-center gap-2"
                          >
                            <span>View on Snapshot</span>
                            <ExternalLink size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardSpotlight>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
