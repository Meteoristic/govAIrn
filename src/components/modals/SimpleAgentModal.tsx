import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Check, Wallet } from 'lucide-react';
import { AgentKitService } from '@/lib/services/agent-kit.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface SimpleAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  daoId: string;
  daoName: string;
  onSuccess: (agentId: string) => void;
}

export const SimpleAgentModal: React.FC<SimpleAgentModalProps> = ({
  isOpen,
  onClose,
  daoId,
  daoName,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agentWallet, setAgentWallet] = useState('');
  
  const { toast } = useToast();
  const { user, wallet } = useAuth();
  
  const handleCreateAgent = async () => {
    if (!user?.id || !wallet) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your wallet to enable auto-voting.',
        variant: 'destructive'
      });
      return;
    }
    
    const walletAddress = wallet.toLowerCase();
    console.log(`Creating agent with wallet: ${walletAddress}`);
    
    setLoading(true);
    
    try {
      // Create agent wallet
      const agentName = `${daoName} Execution Agent`;
      const agentDescription = `Auto-vote execution agent for ${daoName} DAO`;
      const agentId = crypto.randomUUID();
      
      // Create agent wallet and enable auto-vote
      await AgentKitService.enableAutoVote(user.id, daoId, agentId, walletAddress);
      
      // Set agent wallet for display
      setAgentWallet(walletAddress);
      setSuccess(true);
      
      // Call success callback
      onSuccess(agentId);
      
      toast({
        title: 'Auto-Vote Enabled',
        description: 'Your auto-vote agent has been created successfully.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create auto-vote agent. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-black border border-silver/20 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          {!success ? (
            <>
              <h2 className="text-2xl font-bold text-phosphor mb-2">Set Up Auto-Vote</h2>
              <p className="text-silver mb-6">Create an execution agent to auto-vote on your behalf for {daoName} DAO.</p>
              
              <div className="bg-black/30 border border-silver/10 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo/20 flex items-center justify-center">
                    <Bot className="text-indigo" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-phosphor">{daoName} Execution Agent</h3>
                    <p className="text-sm text-silver">Auto-votes based on your preferences</p>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-silver">
                    <Check size={16} className="text-teal mt-0.5" />
                    <span>Automatically vote on proposals</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-silver">
                    <Check size={16} className="text-teal mt-0.5" />
                    <span>Votes align with your governance preferences</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-silver">
                    <Check size={16} className="text-teal mt-0.5" />
                    <span>Disable auto-voting anytime</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleCreateAgent}
                  disabled={loading}
                  className="bg-indigo hover:bg-indigo/90 w-full"
                >
                  {loading ? 'Setting up...' : 'Enable Auto-Vote'}
                </Button>
                
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-silver/20 text-silver hover:bg-black/30 w-full"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mb-3">
                  <Check size={32} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-phosphor mb-1">Auto-Vote Enabled</h2>
                <p className="text-center text-silver">Your execution agent is ready to vote on your behalf.</p>
              </div>
              
              <div className="bg-black/30 border border-silver/10 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={16} className="text-indigo" />
                  <h3 className="font-medium text-phosphor">Agent Wallet</h3>
                </div>
                <p className="text-xs font-mono text-silver mb-1 truncate">{agentWallet}</p>
                <p className="text-xs text-silver">This wallet will execute votes on your behalf</p>
              </div>
              
              <Button 
                onClick={onClose}
                className="bg-indigo hover:bg-indigo/90 w-full"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};
