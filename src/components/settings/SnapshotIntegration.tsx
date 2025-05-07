import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DaoService } from '@/lib/services/dao.service';
import { ProposalService } from '@/lib/services/proposal.service';
import { Badge } from '@/components/ui/badge';

interface SnapshotDAO {
  id: string;
  name: string;
  logo_url?: string;
  is_base_ecosystem?: boolean;
}

export default function SnapshotIntegration() {
  const [snapshotDAOs, setSnapshotDAOs] = useState<SnapshotDAO[]>([]);
  const [newSpaceId, setNewSpaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingDAO, setSyncingDAO] = useState('');
  const [syncResult, setSyncResult] = useState<null | {
    added: number;
    updated: number;
    failed: number;
  }>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [seedingBaseDAOs, setSeedingBaseDAOs] = useState(false);
  const [baseSeedResult, setBaseSeedResult] = useState<null | {
    added: number;
    updated: number;
    failed: number;
  }>(null);

  // Load Snapshot DAOs on component mount
  useEffect(() => {
    loadSnapshotDAOs();
  }, []);

  const loadSnapshotDAOs = async () => {
    try {
      setLoading(true);
      const daos = await DaoService.listSnapshotDAOs();
      setSnapshotDAOs(daos);
      setErrorMessage('');
    } catch (error) {
      console.error('Error loading Snapshot DAOs:', error);
      setErrorMessage('Failed to load Snapshot DAOs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSnapshotSpace = async () => {
    if (!newSpaceId) return;

    try {
      setLoading(true);
      setSyncingDAO(newSpaceId);
      
      // Add the Snapshot space to our database
      const daoId = await DaoService.syncDAOFromSnapshot(newSpaceId);
      
      if (daoId) {
        // If successful, also sync its proposals
        const result = await ProposalService.syncProposalsFromSnapshot(daoId, 'active');
        setSyncResult(result);
        
        // Refresh the list of DAOs
        await loadSnapshotDAOs();
        
        // Clear the input
        setNewSpaceId('');
        setErrorMessage('');
      } else {
        setErrorMessage(`Failed to add Snapshot space "${newSpaceId}"`);
      }
    } catch (error) {
      console.error('Error adding Snapshot space:', error);
      setErrorMessage(`Error adding Snapshot space: ${String(error)}`);
    } finally {
      setSyncingDAO('');
      setLoading(false);
    }
  };

  const handleSyncProposals = async (daoId: string) => {
    try {
      setSyncingDAO(daoId);
      const result = await ProposalService.syncProposalsFromSnapshot(daoId, 'active');
      setSyncResult(result);
      setErrorMessage('');
    } catch (error) {
      console.error(`Error syncing proposals for DAO ${daoId}:`, error);
      setErrorMessage(`Failed to sync proposals for ${daoId}`);
    } finally {
      setSyncingDAO('');
    }
  };

  const handleSeedBaseEcosystemDAOs = async () => {
    try {
      setSeedingBaseDAOs(true);
      const result = await DaoService.seedBaseEcosystemDAOs();
      setBaseSeedResult(result);
      
      // Refresh the list of DAOs after seeding
      await loadSnapshotDAOs();
      setErrorMessage('');
    } catch (error) {
      console.error('Error seeding Base ecosystem DAOs:', error);
      setErrorMessage('Failed to seed Base ecosystem DAOs');
    } finally {
      setSeedingBaseDAOs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-3">
        <h3 className="text-lg font-medium text-phosphor">Add Snapshot Space</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Enter Snapshot space ID (e.g., 'ens.eth')"
            value={newSpaceId}
            onChange={(e) => setNewSpaceId(e.target.value)}
            className="flex-1 bg-black/40 border-silver/20 text-silver"
          />
          <Button 
            onClick={handleAddSnapshotSpace} 
            disabled={loading || !newSpaceId}
            className="bg-indigo hover:bg-indigo/90"
          >
            {syncingDAO === newSpaceId ? 'Adding...' : 'Add & Sync'}
          </Button>
        </div>
        {errorMessage && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
        {syncResult && (
          <div className="text-sm text-silver bg-black/30 p-3 rounded-md">
            <p>Sync complete! Added: {syncResult.added}, Updated: {syncResult.updated}, Failed: {syncResult.failed}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-phosphor">Base Ecosystem DAOs</h3>
          <Button 
            onClick={handleSeedBaseEcosystemDAOs} 
            disabled={seedingBaseDAOs}
            className="bg-cyan hover:bg-cyan/90"
            size="sm"
          >
            {seedingBaseDAOs ? 'Seeding...' : 'Initialize Base DAOs'}
          </Button>
        </div>
        
        {baseSeedResult && (
          <div className="text-sm text-silver bg-black/30 p-3 rounded-md">
            <p>Base DAO seed complete! Added: {baseSeedResult.added}, Updated: {baseSeedResult.updated}, Failed: {baseSeedResult.failed}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          {DaoService.BASE_ECOSYSTEM_DAOS.map((dao) => (
            <div key={dao.id} className="flex items-center gap-2 p-3 bg-black/30 border-silver/10 border rounded-md">
              <div className="w-8 h-8 rounded-full bg-indigo/20 flex items-center justify-center text-indigo font-bold">
                {dao.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-phosphor truncate">{dao.name}</div>
                <div className="text-xs text-silver/70 truncate">{dao.id}</div>
              </div>
              <Badge variant="outline" className="text-xs bg-cyan/10 text-cyan border-cyan/20">
                Base
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-phosphor">Connected Snapshot Spaces</h3>
        {loading ? (
          <p className="text-silver">Loading spaces...</p>
        ) : snapshotDAOs.length === 0 ? (
          <p className="text-sm text-silver/70 p-4 bg-black/30 border-silver/10 border rounded-md">
            No Snapshot spaces added yet. Add a space above to sync proposals.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshotDAOs.map((dao) => (
              <div key={dao.id} className="flex items-center justify-between p-4 bg-black/30 border-silver/10 border rounded-md">
                <div className="flex items-center gap-3">
                  {dao.logo_url && (
                    <img 
                      src={dao.logo_url} 
                      alt={dao.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="text-phosphor">{dao.name}</div>
                    <div className="text-xs text-silver/70">{dao.id}</div>
                  </div>
                </div>
                <Button
                  onClick={() => handleSyncProposals(dao.id)}
                  disabled={syncingDAO === dao.id}
                  variant="outline"
                  className="border-silver/20 text-silver hover:text-phosphor"
                >
                  {syncingDAO === dao.id ? 'Syncing...' : 'Sync Proposals'}
                </Button>
              </div>
            ))}
          </div>
        )}
        {snapshotDAOs.filter(dao => dao.is_base_ecosystem).length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-cyan/20 text-cyan hover:bg-cyan/30">Base Ecosystem</Badge>
            <span className="text-xs text-silver">
              {snapshotDAOs.filter(dao => dao.is_base_ecosystem).length} Base ecosystem DAOs connected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
