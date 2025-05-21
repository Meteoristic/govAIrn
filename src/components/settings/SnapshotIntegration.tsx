import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DaoService } from '@/lib/services/dao.service';
import { ProposalService } from '@/lib/services/proposal.service';
import { Badge } from '@/components/ui/badge';
import { SnapshotService } from '@/lib/services/snapshot.service';
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { eventBus, EVENTS } from '@/lib/utils/events';

// Import the SUPPORTED_DAOS array from ProposalFeed to help with synchronization
import { SUPPORTED_DAOS as dashboardSupportedDaos } from '@/components/dashboard/ProposalFeed';

// Create a Supabase client with the admin key to bypass RLS policies
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Log warning if service role key is missing
if (!supabaseKey) {
  console.error('[CRITICAL ERROR] Service role key is missing! DAO seeding functionality will not work correctly.');
}

// Create a dedicated admin client with service role key to bypass RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('[ADMIN] Created Supabase admin client with service role key for DAO seeding');

interface SnapshotDAO {
  id: string;
  name: string;
  logo_url?: string;
  is_base_ecosystem?: boolean;
}

export default function SeedDAOs() {
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
  const { toast } = useToast();

  // Load Snapshot DAOs on component mount
  useEffect(() => {
    loadSnapshotDAOs();
  }, []);

  const loadSnapshotDAOs = async () => {
    try {
      setLoading(true);
      // Get all DAOs instead of just Snapshot DAOs to show comprehensive list
      const daos = await DaoService.getAllDaos();
      setSnapshotDAOs(daos);
      setErrorMessage('');
    } catch (error) {
      console.error('Error loading DAOs:', error);
      setErrorMessage('Failed to load DAOs');
    } finally {
      setLoading(false);
    }
  };

  // Function to automatically add a seeded DAO to the SUPPORTED_DAOS list
  const addToSupportedDaos = (daoId: string, daoName: string) => {
    // Check if the DAO is already in the supported list
    const isAlreadySupported = dashboardSupportedDaos.some(dao => dao.id === daoId);
    
    if (!isAlreadySupported) {
      console.log(`Adding ${daoName} (${daoId}) to SUPPORTED_DAOS for the dashboard`);
      
      // Get the first letter as the icon
      const icon = daoName.charAt(0).toUpperCase();
      
      // Add to the supported DAOs array
      dashboardSupportedDaos.push({ id: daoId, name: daoName, icon });
      
      console.log(`Successfully added ${daoName} to supported DAOs. New count: ${dashboardSupportedDaos.length}`);
      
      // Emit an event to notify components that the DAO list has been updated
      eventBus.emit(EVENTS.DAO_LIST_UPDATED, dashboardSupportedDaos);
      
      // We're directly modifying the exported array which will affect future imports
      // This is a simple solution that doesn't require persisting to localStorage
    }
  };

  const handleSeedDAO = async () => {
    if (!newSpaceId) return;

    try {
      setLoading(true);
      setSyncingDAO(newSpaceId);
      setErrorMessage('');
      
      // First fetch space details from Snapshot to confirm it exists
      const spaceData = await SnapshotService.getSpace(newSpaceId);
      
      if (!spaceData) {
        setErrorMessage(`Could not find Snapshot space with ID: ${newSpaceId}`);
        toast({
          title: "Space Not Found",
          description: `Could not find a Snapshot space with ID: ${newSpaceId}`,
          variant: "destructive"
        });
        setLoading(false);
        setSyncingDAO('');
        return;
      }
      
      // Determine platform based on network
      let platform = 'Snapshot';
      let isBaseEcosystem = false;
      
      if (spaceData.network) {
        switch (spaceData.network) {
          case '1':
            platform = 'Ethereum';
            break;
          case '8453':
            platform = 'Base';
            isBaseEcosystem = true;
            break;
          case '10':
            platform = 'Optimism';
            break;
          case '42161':
            platform = 'Arbitrum';
            break;
          case '137':
            platform = 'Polygon';
            break;
          default:
            platform = `Chain ID: ${spaceData.network}`;
        }
      }
      
      // Prepare DAO data for insertion
      const daoData = {
        id: spaceData.id,
        name: spaceData.name || newSpaceId,
        logo_url: spaceData.avatar || '',
        description: spaceData.about || `DAO governance space for ${spaceData.name || newSpaceId}`,
        platform,
        governance_url: `https://snapshot.org/#/${newSpaceId}`,
        is_base_ecosystem: isBaseEcosystem,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Check if DAO already exists - using supabaseAdmin to bypass RLS
      const { data: existingDAO, error: checkError } = await supabaseAdmin
        .from('daos')
        .select('*')
        .eq('id', daoData.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing DAO:', checkError);
      }
      
      let daoId = daoData.id;
      let result = { added: 0, updated: 0, failed: 0 };
      
      if (existingDAO) {
        // Update existing DAO using supabaseAdmin
        console.log(`Updating existing DAO: ${existingDAO.id}`);
        const { error: updateError } = await supabaseAdmin
          .from('daos')
          .update({
            ...daoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', daoData.id);
          
        if (updateError) {
          console.error('Error updating DAO:', updateError);
          setErrorMessage(`Error updating DAO: ${updateError.message}`);
          result.failed = 1;
        } else {
          result.updated = 1;
          console.log(`Successfully updated DAO: ${daoData.name}`);
          toast({
            title: "DAO Updated",
            description: `Successfully updated ${daoData.name} DAO`,
            variant: "default"
          });
          
          // Make sure this DAO is in the SUPPORTED_DAOS list
          addToSupportedDaos(daoId, daoData.name);
        }
      } else {
        // Insert new DAO using supabaseAdmin
        console.log(`Creating new DAO: ${daoData.name} (${daoData.id})`);
        const { error: insertError } = await supabaseAdmin
          .from('daos')
          .insert(daoData);
          
        if (insertError) {
          console.error('Error inserting DAO:', insertError);
          setErrorMessage(`Error creating DAO: ${insertError.message}`);
          result.failed = 1;
        } else {
          result.added = 1;
          console.log(`Successfully created DAO: ${daoData.name}`);
          toast({
            title: "DAO Added",
            description: `Successfully added ${daoData.name} DAO`,
            variant: "default"
          });
          
          // Add this new DAO to the SUPPORTED_DAOS list
          addToSupportedDaos(daoId, daoData.name);
        }
      }
      
      // If the DAO was successfully added or updated, also sync its proposals
      if (result.added > 0 || result.updated > 0) {
        try {
          console.log(`Syncing proposals for DAO: ${daoId}`);
          const proposalResult = await ProposalService.syncProposalsFromSnapshot(daoId, 'active');
          if (proposalResult) {
            setSyncResult({
              added: proposalResult.added,
              updated: proposalResult.updated,
              failed: proposalResult.failed
            });
            
            console.log(`Successfully synced proposals: Added: ${proposalResult.added}, Updated: ${proposalResult.updated}`);
            toast({
              title: "Proposals Synced",
              description: `Added: ${proposalResult.added}, Updated: ${proposalResult.updated}, Failed: ${proposalResult.failed}`,
              variant: "default"
            });
          }
        } catch (proposalError) {
          console.error('Error syncing proposals:', proposalError);
          setErrorMessage(`DAO added but failed to sync proposals: ${String(proposalError)}`);
        }
      }
      
      // Refresh the list of DAOs to show the new one
      await loadSnapshotDAOs();
      
      // Clear the input
      setNewSpaceId('');
    } catch (error) {
      console.error('Error seeding DAO:', error);
      setErrorMessage(`Error seeding DAO: ${String(error)}`);
      toast({
        title: "Error",
        description: `Failed to seed DAO: ${String(error)}`,
        variant: "destructive"
      });
    } finally {
      setSyncingDAO('');
      setLoading(false);
    }
  };

  const handleSyncProposals = async (daoId: string) => {
    try {
      setSyncingDAO(daoId);
      
      // Check if DAO exists first using supabaseAdmin
      const { data: dao, error: daoError } = await supabaseAdmin
        .from('daos')
        .select('name')
        .eq('id', daoId)
        .single();
        
      if (daoError) {
        console.error(`Error finding DAO ${daoId}:`, daoError);
        setErrorMessage(`Could not find DAO with ID: ${daoId}`);
        toast({
          title: "Error",
          description: `Could not find DAO: ${daoError.message}`,
          variant: "destructive"
        });
        setSyncingDAO('');
        return;
      }
      
      console.log(`Syncing proposals for ${dao.name} (${daoId})...`);
      
      try {
        // First attempt: Try using ProposalService which should have proper error handling
        console.log(`Using ProposalService to sync proposals for ${daoId}`);
        const result = await ProposalService.syncProposalsFromSnapshot(daoId, 'active');
        
        setSyncResult({
          added: result.added || 0,
          updated: result.updated || 0,
          failed: result.failed || 0
        });
        
        setErrorMessage('');
        
        toast({
          title: "Proposals Synced",
          description: `Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`,
          variant: "default"
        });
        
        // If no active proposals found, try closed proposals
        if ((result.added === 0 && result.updated === 0) && result.failed === 0) {
          console.log(`No active proposals found for ${daoId}, trying closed proposals...`);
          toast({
            title: "No Active Proposals",
            description: "Trying to sync closed proposals instead...",
            duration: 3000,
          });
          
          // Try using ProposalService for closed proposals
          const closedResult = await ProposalService.syncProposalsFromSnapshot(daoId, 'closed');
          
          setSyncResult({
            added: closedResult.added || 0,
            updated: closedResult.updated || 0,
            failed: closedResult.failed || 0
          });
          
          toast({
            title: "Closed Proposals Synced",
            description: `Added: ${closedResult.added}, Updated: ${closedResult.updated}, Failed: ${closedResult.failed}`,
            variant: "default"
          });
        }
      } catch (edgeFunctionError) {
        // If the edge function approach fails, fall back to direct Snapshot API and database approach
        console.error(`Edge function sync failed for ${daoId}, falling back to direct sync:`, edgeFunctionError);
        toast({
          title: "Edge Function Failed",
          description: "Falling back to direct sync...",
          variant: "destructive",
          duration: 3000,
        });
        
        // Direct sync fallback
        try {
          // Get both active and closed proposals to ensure we have the latest ones
          console.log(`Directly fetching active proposals from Snapshot API for ${daoId}...`);
          const activeProposals = await SnapshotService.getProposals(daoId, 'active');
          console.log(`Found ${activeProposals.length} active proposals for ${daoId}`);
          
          console.log(`Directly fetching closed proposals from Snapshot API for ${daoId}...`);
          const closedProposals = await SnapshotService.getProposals(daoId, 'closed');
          console.log(`Found ${closedProposals.length} closed proposals for ${daoId}`);
          
          // Combine proposals and sort by end date (newest first)
          const allProposals = [...activeProposals, ...closedProposals];
          allProposals.sort((a, b) => b.end - a.end); // Sort by end time, newest first
          
          // Take the most recent 10 proposals
          const latestProposals = allProposals.slice(0, 10);
          console.log(`Processing ${latestProposals.length} latest proposals (active + closed) for ${daoId}`);
          
          let result = { added: 0, updated: 0, failed: 0 };
          
          // Process each proposal manually
          for (const proposal of latestProposals) {
            try {
              // Convert Snapshot state to our status format
              let status = proposal.state === 'active' ? 'active' : 
                          proposal.state === 'closed' ? 'executed' : 'missed';
              
              // Extract a summary from the proposal body
              const summary = proposal.body ? 
                proposal.body.substring(0, proposal.body.indexOf('\n', 100) !== -1 ? 
                  proposal.body.indexOf('\n', 100) : 200) : 
                'No description available';
              
              // Format for our database
              const proposalData = {
                external_id: proposal.id,
                dao_id: daoId,
                title: proposal.title,
                summary: summary,
                description: proposal.body,
                status,
                start_time: new Date(proposal.start * 1000).toISOString(),
                end_time: new Date(proposal.end * 1000).toISOString(),
                voting_type: 'simple majority',
                quorum: 'N/A',
                impact: 'medium',
                url: `https://snapshot.org/#/${daoId}/proposal/${proposal.id}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // Check if proposal already exists
              const { data: existingProposal, error: checkError } = await supabaseAdmin
                .from('proposals')
                .select('id')
                .eq('external_id', proposal.id)
                .single();
                
              if (checkError && checkError.code !== 'PGRST116') {
                console.error(`Error checking for existing proposal ${proposal.id}:`, checkError);
                result.failed++;
                continue;
              }
              
              // Insert or update the proposal
              if (existingProposal) {
                const { error: updateError } = await supabaseAdmin
                  .from('proposals')
                  .update(proposalData)
                  .eq('id', existingProposal.id);
                  
                if (updateError) {
                  console.error(`Error updating proposal ${proposal.id}:`, updateError);
                  result.failed++;
                } else {
                  result.updated++;
                }
              } else {
                const { error: insertError } = await supabaseAdmin
                  .from('proposals')
                  .insert(proposalData);
                  
                if (insertError) {
                  console.error(`Error inserting proposal ${proposal.id}:`, insertError);
                  result.failed++;
                } else {
                  result.added++;
                }
              }
            } catch (proposalError) {
              console.error(`Error processing proposal:`, proposalError);
              result.failed++;
            }
          }
          
          setSyncResult(result);
          
          toast({
            title: "Proposals Synced (Direct Method)",
            description: `Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`,
            variant: "default"
          });
        } catch (directSyncError) {
          console.error(`Direct sync also failed for ${daoId}:`, directSyncError);
          setErrorMessage(`Failed to sync proposals: Both edge function and direct methods failed`);
          toast({
            title: "Sync Failed",
            description: "All sync methods failed. Please try again later.",
            variant: "destructive"
          });
        }
      }
      
    } catch (error) {
      console.error(`Error syncing proposals for DAO ${daoId}:`, error);
      setErrorMessage(`Failed to sync proposals for ${daoId}`);
      toast({
        title: "Error",
        description: `Failed to sync proposals: ${String(error)}`,
        variant: "destructive"
      });
    } finally {
      setSyncingDAO('');
    }
  };

  const handleSeedBaseEcosystemDAOs = async () => {
    try {
      setSeedingBaseDAOs(true);
      
      // Read the existing Base ecosystem DAOs
      const { data: existingDAOs, error: checkError } = await supabaseAdmin
        .from('daos')
        .select('id')
        .eq('is_base_ecosystem', true);
      
      if (checkError) {
        console.error('Error checking existing DAOs:', checkError);
        throw new Error(`Failed to check existing DAOs: ${checkError.message}`);
      }
      
      const existingIds = existingDAOs?.map(dao => dao.id) || [];
      console.log('Existing Base ecosystem DAOs:', existingIds);
      
      // Insert Base ecosystem DAOs if they don't exist
      let addedCount = 0;
      for (const dao of DaoService.BASE_ECOSYSTEM_DAOS) {
        // Use the fallbackId or id as the DAO ID
        const daoId = dao.fallbackId || dao.id;
        
        if (!existingIds.includes(daoId)) {
          const { error: insertError } = await supabaseAdmin
            .from('daos')
            .insert([{
              id: daoId,
              name: dao.name,
              description: dao.description || '',
              platform: dao.platform || 'Snapshot',
              governance_url: `https://snapshot.org/#/${dao.id}`,
              is_base_ecosystem: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
            
          if (insertError) {
            console.error(`Error adding DAO ${dao.name}:`, insertError);
          } else {
            addedCount++;
            console.log(`Added Base DAO: ${dao.name} (${daoId})`);
            
            // Add this new DAO to the SUPPORTED_DAOS list
            addToSupportedDaos(daoId, dao.name);
          }
        } else {
          // Make sure existing Base DAOs are in the SUPPORTED_DAOS list
          addToSupportedDaos(daoId, dao.name);
        }
      }
      
      setBaseSeedResult({
        added: addedCount,
        updated: 0,
        failed: 0
      });
      
      // Refresh the list of DAOs after seeding
      await loadSnapshotDAOs();
      setErrorMessage('');
      
      // Emit an event to notify all components that the DAO list has been updated
      // This is especially important after seeding multiple DAOs
      eventBus.emit(EVENTS.DAO_LIST_UPDATED, dashboardSupportedDaos);
      
      toast({
        title: "Base Ecosystem DAOs Seeded",
        description: `Added ${addedCount} new Base ecosystem DAOs`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error adding Base ecosystem DAOs:', error);
      setErrorMessage(`Failed to seed Base ecosystem DAOs: ${String(error)}`);
      toast({
        title: "Error",
        description: `Failed to seed Base ecosystem DAOs: ${String(error)}`,
        variant: "destructive"
      });
    } finally {
      setSeedingBaseDAOs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-phosphor">Seed New DAO from Snapshot</h3>
          <Button 
            onClick={handleSeedBaseEcosystemDAOs} 
            disabled={seedingBaseDAOs}
            className="bg-cyan hover:bg-cyan/90"
            size="sm"
          >
            {seedingBaseDAOs ? 'Seeding Base DAOs...' : 'Seed Base DAOs'}
          </Button>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="Enter Snapshot space ID (e.g., 'ens.eth')"
            value={newSpaceId}
            onChange={(e) => setNewSpaceId(e.target.value)}
            className="flex-1 bg-black/40 border-silver/20 text-silver"
          />
          <Button 
            onClick={handleSeedDAO} 
            disabled={loading || !newSpaceId}
            className="bg-indigo hover:bg-indigo/90"
          >
            {syncingDAO === newSpaceId ? 'Seeding...' : 'Seed DAO'}
          </Button>
        </div>
        {errorMessage && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 p-3 rounded-md border border-red-800/50">
            <AlertCircle className="h-4 w-4" />
            <p>{errorMessage}</p>
          </div>
        )}
        {(syncResult || baseSeedResult) && (
          <div className="flex items-center gap-2 text-sm text-silver bg-emerald-950/30 p-3 rounded-md border border-emerald-800/50">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            {syncResult && (
              <p>Sync complete! Added: {syncResult.added}, Updated: {syncResult.updated}, Failed: {syncResult.failed}</p>
            )}
            {baseSeedResult && (
              <p>Base DAO seed complete! Added: {baseSeedResult.added}, Updated: {baseSeedResult.updated}, Failed: {baseSeedResult.failed}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-phosphor">Seeded DAOs</h3>
        {loading ? (
          <p className="text-silver">Loading DAOs...</p>
        ) : snapshotDAOs.length === 0 ? (
          <p className="text-sm text-silver/70 p-4 bg-black/30 border-silver/10 border rounded-md">
            No DAOs added yet. Use the form above to seed a DAO.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshotDAOs.map((dao) => (
              <div key={dao.id} className="flex items-center justify-between p-4 bg-black/30 border-silver/10 border rounded-md">
                <div className="flex items-center gap-3">
                  {dao.logo_url ? (
                    <img 
                      src={dao.logo_url} 
                      alt={dao.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo/20 flex items-center justify-center text-indigo font-bold">
                      {dao.name[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-phosphor">{dao.name}</div>
                    <div className="text-xs text-silver/70">{dao.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dao.is_base_ecosystem && (
                    <Badge className="bg-cyan/20 text-cyan hover:bg-cyan/30 border-white/5 mr-2">
                      Base
                    </Badge>
                  )}
                  <Button
                    onClick={() => handleSyncProposals(dao.id)}
                    disabled={syncingDAO === dao.id}
                    variant="outline"
                    className="border-silver/20 text-silver hover:text-phosphor"
                  >
                    {syncingDAO === dao.id ? 'Syncing...' : 'Sync Proposals'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
