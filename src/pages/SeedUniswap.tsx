import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';
import { SnapshotService } from '@/lib/services/snapshot.service';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Create an admin Supabase client with the service role key
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default function SeedUniswap() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const seedUniswapDirectly = async () => {
    setLoading(true);
    addLog('Starting Uniswap DAO seeding process...');

    const uniswapDao = {
      id: 'uniswapgovernance.eth',
      name: 'Uniswap',
      description: 'Leading decentralized exchange protocol',
      platform: 'Ethereum',
      logo_url: 'https://assets.coingecko.com/coins/images/12504/standard/uniswap-uni.png',
      governance_url: 'https://snapshot.org/#/uniswapgovernance.eth',
      is_base_ecosystem: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // First, try to get Snapshot data to enrich our DAO
      addLog('Fetching Snapshot data for Uniswap...');
      const snapshotSpace = await SnapshotService.getSpace('uniswapgovernance.eth');
      
      if (snapshotSpace) {
        addLog(`✅ Found Snapshot space: ${snapshotSpace.name}`);
        
        // Enrich our data with Snapshot info
        Object.assign(uniswapDao, {
          name: snapshotSpace.name || uniswapDao.name,
          description: snapshotSpace.about || uniswapDao.description,
          logo_url: snapshotSpace.avatar || uniswapDao.logo_url,
        });
      } else {
        addLog('⚠️ No Snapshot space found, using fallback data');
      }

      // Check if DAO already exists - use admin client to bypass RLS
      addLog('Checking if Uniswap DAO already exists in database (using admin privileges)...');
      const { data: existingDAO, error: checkError } = await supabaseAdmin
        .from('daos')
        .select('*')
        .eq('id', uniswapDao.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking for existing DAO: ${checkError.message}`);
      }

      // Insert or update the DAO - use admin client to bypass RLS
      if (existingDAO) {
        addLog(`Found existing Uniswap DAO in database, updating...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('daos')
          .update({
            ...uniswapDao,
            updated_at: new Date().toISOString()
          })
          .eq('id', uniswapDao.id);
          
        if (updateError) {
          throw new Error(`Error updating DAO: ${updateError.message}`);
        }
        
        addLog('✅ Successfully updated Uniswap DAO');
      } else {
        addLog('Uniswap DAO not found in database, creating new entry...');
        
        // Direct insert with admin privileges
        const { error: insertError } = await supabaseAdmin
          .from('daos')
          .insert([uniswapDao]);
            
        if (insertError) {
          throw new Error(`Error inserting DAO: ${insertError.message}`);
        }
        
        addLog('✅ Successfully added Uniswap DAO to database');
      }

      // Verify the DAO was added - use admin client to bypass RLS
      const { data: verificationData, error: verificationError } = await supabaseAdmin
        .from('daos')
        .select('*')
        .eq('id', uniswapDao.id);
      
      if (verificationError) {
        throw new Error(`Error verifying DAO: ${verificationError.message}`);
      }
      
      if (verificationData && verificationData.length > 0) {
        addLog(`✅ VERIFICATION SUCCESSFUL: Uniswap DAO is now in the database`);
        addLog(`DAO details: ${JSON.stringify(verificationData[0])}`);
        addLog(`\nPlease go to the /daos page to see Uniswap DAO in the list.`);
      } else {
        addLog(`❌ VERIFICATION FAILED: Uniswap DAO could not be found in database after seeding`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-phosphor mb-6 bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent">
          Seed Uniswap DAO
        </h1>
        
        <Card className="bg-black/30 p-6 rounded-xl">
          <h2 className="text-xl font-bold text-phosphor mb-4">Add Uniswap to DAOs</h2>
          
          <div className="space-y-2 mb-6">
            <p className="text-silver text-sm">
              This tool will properly seed the Uniswap DAO into the database so it appears
              alongside ENS, Aave, and Gitcoin in the DAOs page. The tool uses admin privileges
              to bypass Row Level Security.
            </p>
            
            <Button 
              onClick={seedUniswapDirectly} 
              disabled={loading}
              className="bg-indigo/20 text-indigo hover:bg-indigo/30 border border-indigo/30 mt-4"
            >
              {loading ? "Seeding..." : "Seed Uniswap DAO"}
            </Button>
          </div>
          
          <div className="bg-black/50 p-4 rounded-md font-mono text-xs h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-silver/50">Click the button above to seed Uniswap DAO. Results will appear here.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.includes('❌') ? 'text-red-400' : 
                  log.includes('✅') ? 'text-green-400' : 
                  log.includes('⚠️') ? 'text-amber-400' :
                  'text-silver'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
