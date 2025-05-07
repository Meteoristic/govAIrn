import React, { useEffect, useState } from 'react';
import { ProposalService } from '@/lib/services/proposal.service';
import { DaoService } from '@/lib/services/dao.service';
import { Proposal } from '@/lib/types/proposal';
import { DAO } from '@/lib/types/dao';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface DaoProposalsListProps {
  daoId: string;
}

export default function DaoProposalsList({ daoId }: DaoProposalsListProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [dao, setDao] = useState<DAO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDaoAndProposals();
  }, [daoId]);

  const fetchDaoAndProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get DAO details
      const daoResult = await DaoService.getDAO(daoId);
      if (daoResult) {
        setDao(daoResult);
      }

      // Get proposals for this DAO
      const proposalsResult = await ProposalService.listProposals({
        daoId,
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

  const handleSyncProposals = async () => {
    try {
      setSyncing(true);
      
      // Try to sync active proposals first
      const activeResult = await ProposalService.syncProposalsFromSnapshot(daoId, 'active');
      console.log(`Synced active proposals: ${activeResult.added} added, ${activeResult.updated} updated`);
      
      // If no active proposals, try closed ones
      if (activeResult.added === 0 && activeResult.updated === 0) {
        console.log(`No active proposals for ${daoId}, trying closed proposals...`);
        const closedResult = await ProposalService.syncProposalsFromSnapshot(daoId, 'closed');
        console.log(`Synced closed proposals: ${closedResult.added} added, ${closedResult.updated} updated`);
      }
      
      // Refresh the list
      fetchDaoAndProposals();
    } catch (err) {
      console.error('Error syncing proposals:', err);
      setError('Failed to sync proposals');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500 hover:bg-green-600';
      case 'closed':
        return 'bg-gray-500 hover:bg-gray-600';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {dao ? dao.name : 'DAO'} Proposals
        </h2>
        <Button
          onClick={handleSyncProposals}
          disabled={syncing}
          className="bg-cyan hover:bg-cyan/90"
        >
          {syncing ? 'Syncing...' : 'Sync Proposals'}
        </Button>
      </div>

      {loading ? (
        // Skeleton loading state
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center mt-2">
                  <Skeleton className="h-4 w-20 mr-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
          <div className="mt-2">
            <Button onClick={handleSyncProposals} disabled={syncing}>
              Try Again
            </Button>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-gray-500 mb-4">No proposals found for this DAO</p>
          <Button onClick={handleSyncProposals} disabled={syncing}>
            Sync Proposals
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">{proposal.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {proposal.description
                    ? proposal.description.substring(0, 150) + (proposal.description.length > 150 ? '...' : '')
                    : 'No description available'}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusBadgeColor(proposal.status)}>
                      {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDate(proposal.end_time)}
                    </div>
                  </div>
                  
                  {proposal.url && (
                    <Link href={proposal.url} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        View on Snapshot
                        <ArrowRightIcon className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
