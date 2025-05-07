import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DaoService } from '@/lib/services/dao.service';
import { ProposalService } from '@/lib/services/proposal.service';
import { SnapshotService } from '@/lib/services/snapshot.service';

/**
 * Diagnostics component to test Snapshot API integration
 * This component is for testing only and doesn't modify any existing UI
 */
export default function SnapshotTest() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSpaceRetrieval = async () => {
    setLoading(true);
    addLog('======= TESTING SPACE RETRIEVAL =======');

    // Test space retrieval for all Base DAOs
    for (const daoInfo of DaoService.BASE_ECOSYSTEM_DAOS) {
      try {
        addLog(`Fetching space data for ${daoInfo.id}...`);
        const spaceData = await SnapshotService.getSpace(daoInfo.id);
        
        if (spaceData) {
          addLog(`✅ Successfully retrieved space: ${spaceData.name}`);
          addLog(`  Network: ${spaceData.network}, Symbol: ${spaceData.symbol}`);
          addLog(`  Has avatar: ${Boolean(spaceData.avatar)}`);
        } else {
          addLog(`❌ Failed to retrieve space: ${daoInfo.id}`);
        }
      } catch (error) {
        addLog(`❌ Error fetching space ${daoInfo.id}: ${String(error)}`);
      }
    }
    
    setLoading(false);
  };

  const testProposalRetrieval = async () => {
    setLoading(true);
    addLog('======= TESTING PROPOSAL RETRIEVAL =======');

    // Test proposal retrieval for all Base DAOs
    for (const daoInfo of DaoService.BASE_ECOSYSTEM_DAOS) {
      try {
        addLog(`Fetching active proposals for ${daoInfo.id}...`);
        const proposals = await SnapshotService.getProposals(daoInfo.id, 'active');
        
        if (proposals.length > 0) {
          addLog(`✅ Found ${proposals.length} active proposals for ${daoInfo.id}`);
          proposals.forEach((p, i) => {
            addLog(`  ${i+1}. "${p.title}" (State: ${p.state})`);
            const startDate = new Date(p.start * 1000);
            const endDate = new Date(p.end * 1000);
            addLog(`     ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
          });
        } else {
          addLog(`ℹ️ No active proposals found for ${daoInfo.id}`);
          addLog(`  Checking for closed proposals...`);
          
          const closedProposals = await SnapshotService.getProposals(daoInfo.id, 'closed');
          if (closedProposals.length > 0) {
            addLog(`✅ Found ${closedProposals.length} closed proposals for ${daoInfo.id}`);
            addLog(`  Latest: "${closedProposals[0].title}"`);
          } else {
            addLog(`❌ No proposals found at all for ${daoInfo.id}`);
          }
        }
      } catch (error) {
        addLog(`❌ Error fetching proposals for ${daoInfo.id}: ${String(error)}`);
      }
    }
    
    setLoading(false);
  };

  const testSeedAndSync = async () => {
    setLoading(true);
    addLog('======= TESTING SEED & SYNC =======');

    try {
      // Step 1: Seed Base DAOs
      addLog('Seeding Base ecosystem DAOs...');
      const seedResult = await DaoService.seedBaseEcosystemDAOs();
      addLog(`✅ DAO seeding complete. Added: ${seedResult.added}, Updated: ${seedResult.updated}, Failed: ${seedResult.failed}`);
      
      // Step 2: List DAOs to confirm they're in the database
      const daos = await DaoService.getBaseEcosystemDAOs();
      addLog(`Found ${daos.length} Base ecosystem DAOs in database:`);
      daos.forEach(dao => {
        addLog(`- ${dao.name} (${dao.id})`);
      });
      
      // Step 3: Sync proposals for each DAO
      for (const dao of daos) {
        addLog(`\nSyncing proposals for ${dao.name} (${dao.id})...`);
        const syncResult = await ProposalService.syncProposalsFromSnapshot(dao.id, 'active');
        addLog(`✅ Proposal sync complete for ${dao.id}. Added: ${syncResult.added}, Updated: ${syncResult.updated}, Failed: ${syncResult.failed}`);
        
        if (syncResult.added === 0 && syncResult.updated === 0) {
          // Try closed proposals if no active ones found
          addLog(`No active proposals, trying closed proposals...`);
          const closedSyncResult = await ProposalService.syncProposalsFromSnapshot(dao.id, 'closed');
          addLog(`✅ Closed proposal sync. Added: ${closedSyncResult.added}, Updated: ${closedSyncResult.updated}, Failed: ${closedSyncResult.failed}`);
        }
      }
      
      // Step 4: List proposals
      const proposals = await ProposalService.listProposals({ limit: 10 });
      addLog(`\nFound ${proposals.length} total proposals in database:`);
      proposals.forEach(p => {
        const dao = p.daos as any || {};
        addLog(`- [${dao.name || 'Unknown'}] "${p.title}" (${p.status})`);
      });
      
      addLog('\n✅ TEST COMPLETE! The app should now display real proposal data');
    } catch (error) {
      addLog(`❌ Error during test: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="bg-black/30 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-phosphor mb-4">Snapshot API Integration Test</h2>
        
        <div className="space-y-2 mb-6">
          <p className="text-silver text-sm">
            This diagnostic tool will test the Snapshot API integration without modifying any UI components. 
            It should help identify why real proposal data isn't being displayed.
          </p>
          
          <div className="flex space-x-2 mt-4">
            <Button 
              onClick={testSpaceRetrieval} 
              disabled={loading}
              variant="outline"
              className="border-silver/20 text-silver hover:text-phosphor"
            >
              Test Space Retrieval
            </Button>
            
            <Button 
              onClick={testProposalRetrieval} 
              disabled={loading}
              variant="outline"
              className="border-silver/20 text-silver hover:text-phosphor"
            >
              Test Proposal Retrieval
            </Button>
            
            <Button 
              onClick={testSeedAndSync} 
              disabled={loading}
              className="bg-cyan hover:bg-cyan/90"
            >
              Run Complete Test
            </Button>
          </div>
        </div>
        
        <div className="bg-black/50 p-4 rounded-md font-mono text-xs h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-silver/50">Click a button above to run tests. Results will appear here.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-silver'}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
