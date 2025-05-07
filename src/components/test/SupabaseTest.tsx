import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const SupabaseTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daos, setDaos] = useState<any[]>([]);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Test if we can fetch DAOs from Supabase
      const { data, error } = await supabase.from('daos').select('*');
      
      if (error) {
        throw error;
      }
      
      setDaos(data || []);
      
      toast({
        title: 'Connection successful',
        description: `Retrieved ${data?.length || 0} DAOs from Supabase`,
      });
    } catch (err: any) {
      console.error('Supabase connection error:', err);
      setError(err.message || 'Failed to connect to Supabase');
      toast({
        title: 'Connection failed',
        description: err.message || 'Failed to connect to Supabase',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-black/30 backdrop-blur-md rounded-xl border border-silver/10">
      <h2 className="text-phosphor text-xl mb-4">Supabase Connection Test</h2>
      
      <div className="mb-4">
        <Button 
          onClick={testConnection} 
          disabled={isLoading} 
          className="bg-indigo hover:bg-indigo/90"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md text-red-400 mb-4">
          {error}
        </div>
      )}
      
      {daos.length > 0 && (
        <div>
          <h3 className="text-phosphor mb-2">DAOs from Supabase:</h3>
          <div className="overflow-auto max-h-60">
            <pre className="text-silver text-sm p-3 bg-black/50 rounded-md">
              {JSON.stringify(daos, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupabaseTest;
