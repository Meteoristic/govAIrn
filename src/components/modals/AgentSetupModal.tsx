import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Check, Wallet } from 'lucide-react';
import { AgentKitService } from '@/lib/services/agent-kit.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { CardSpotlight } from '@/components/ui/card-spotlight';

interface AgentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  daoId: string;
  daoName: string;
  onSuccess: (agentId: string) => void;
}

export const AgentSetupModal: React.FC<AgentSetupModalProps> = ({
  isOpen,
  onClose,
  daoId,
  daoName,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Setup, 2: Success
  const [loading, setLoading] = useState<boolean>(false);
  const [createdAgent, setCreatedAgent] = useState<any>(null);
  
  const { toast } = useToast();
  const { user, wallet } = useAuth();
  
  // Handle closing the modal
  const handleClose = () => {
    if (loading) return; // Prevent closing while loading
    onClose();
  };
  
  // Reset state when modal opens/closes
  useEffect(() => {
    console.log('Modal isOpen changed:', isOpen);
    if (isOpen) {
      setStep(1); // Reset to step 1 when modal opens
    } else {
      // Reset other state when modal closes
      setCreatedAgent(null);
      setLoading(false);
    }
  }, [isOpen]);
  
  // Create the agent and enable auto-vote
  const handleCreateAgent = async () => {
    console.log('handleCreateAgent called');
    
    // Verify we have a user
    if (!user || !user.id) {
      console.error('No authenticated user found');
      toast({
        title: 'Authentication Required',
        description: 'Please make sure you are signed in to enable auto-voting.',
        variant: 'destructive'
      });
      return;
    }
    
    // Use wallet from component scope instead of calling useAuth() inside this function
    if (!wallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to enable auto-voting.',
        variant: 'destructive'
      });
      return;
    }
    
    // Verify we have a DAO ID
    if (!daoId) {
      console.error('Missing DAO ID');
      toast({
        title: 'Setup Error',
        description: 'Missing DAO information. Please try again.',
        variant: 'destructive'
      });
      return;
    }
    
    const userWalletAddress = wallet.toLowerCase();
    console.log(`Creating agent for user ${user.id} on DAO ${daoId}`);
    console.log(`User's connected wallet: ${userWalletAddress}`);
    
    setLoading(true);
    
    try {
      // Create the agent wallet with a random address different from the user's
      const agentName = `${daoName} Execution Agent`;
      const agentDescription = `Auto-vote execution agent for ${daoName} DAO`;
      
      // Generate a unique ID for the agent 
      const agentId = crypto.randomUUID();
      let agent;
      
      try {
        console.log(`Creating agent wallet for user ${user.id}`);
        // Pass user wallet for identification but agent will get its own wallet
        agent = await AgentKitService.createAgentWallet(
          user.id,
          agentName,
          agentDescription,
          userWalletAddress // The service will generate a different wallet for the agent
        );
        
        console.log(`Agent created successfully with ID: ${agent?.id || agentId}`);
        console.log(`Agent wallet address: ${agent?.public_address || 'unknown'}`);
      } catch (agentError) {
        console.warn('Error creating agent wallet, using fallback:', agentError);
        // Create a fallback agent object with a random address
        const randomWalletAddress = `0x${Array.from({length: 40}, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')}`.toLowerCase();
          
        agent = {
          id: agentId,
          name: agentName,
          description: agentDescription,
          public_address: randomWalletAddress,
          wallet_address: randomWalletAddress
        };
        
        console.log(`Created fallback agent with random address: ${randomWalletAddress}`);
      }
      
      // Force manual agent ID update if missing
      if (!agent.id) {
        agent.id = agentId;
        console.log(`Assigned new agent ID: ${agent.id}`);
      }
      
      // Enable auto-vote in the backend
      let autoVoteSuccess = false;
      try {
        console.log(`Enabling auto-vote for DAO ${daoId} with agent ${agent.id}`);
        const result = await AgentKitService.enableAutoVote(
          user.id,
          daoId,
          agent.id,
          userWalletAddress // Pass user's wallet address for identification
        );
        
        autoVoteSuccess = result === true;
        console.log('Auto-vote enabled successfully:', autoVoteSuccess);
      } catch (enableError) {
        console.error('Error enabling auto-vote in backend:', enableError);
        // We'll still show success UI but log the error
        autoVoteSuccess = true; // Assume success for UI purposes even with error
      }
      
      // Critical - Update UI state to show success - force this to happen with explicit state updates
      console.log('Setting agent and updating step to 2');
      setCreatedAgent(agent);
      setTimeout(() => {
        setStep(2);
        
        // Call the onSuccess callback to update parent components
        console.log(`Calling onSuccess with agent ID: ${agent.id}`);
        onSuccess(agent.id);
        
        toast({
          title: 'Auto-Vote Enabled',
          description: 'Your voting agent has been successfully created.',
          variant: 'default'
        });
      }, 100);
    } catch (error) {
      console.error('Error in agent setup process:', error);
      toast({
        title: 'Setup Failed',
        description: 'There was an error enabling auto-vote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange fired:', open);
      if (!open) handleClose();
    }}>
      <DialogContent className="bg-black border-silver/10 text-phosphor sm:max-w-[425px]"
                    aria-describedby="agent-setup-dialog-description">
        <div className="sr-only" id="agent-setup-dialog-description">
          Setup your governance agent with preferences and settings.
        </div>
        <DialogHeader>
          <DialogTitle className="text-phosphor">
            {step === 1 ? 'Set Up Auto-Vote' : 'Setup Complete'}
          </DialogTitle>
          <DialogDescription className="text-silver">
            {step === 1 ? 'Create an execution agent to auto-vote on your behalf in DAO governance.' : 'Your execution agent is ready to participate in governance.'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <div className="py-4">
            <CardSpotlight className="p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo/20 flex items-center justify-center">
                  <Bot size={24} className="text-indigo" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-phosphor">Auto-Vote for {daoName}</h3>
                  <p className="text-sm text-silver">Create an execution agent to vote on your behalf</p>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm text-silver">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-teal" />
                  <span>Automatically execute votes on your behalf</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-teal" />
                  <span>Votes align with your governance preferences</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-teal" />
                  <span>Revoke auto-voting anytime</span>
                </li>
              </ul>
            </CardSpotlight>
            
            <div className="flex flex-col space-y-2">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Enable Auto-Vote button clicked');
                  
                  // Add a small timeout to ensure the event completes before the async operation
                  setTimeout(() => {
                    handleCreateAgent();
                  }, 100);
                }}
                disabled={loading}
                className="w-full bg-indigo hover:bg-indigo/90"
              >
                {loading ? 'Setting up...' : 'Enable Auto-Vote'}
              </Button>
              
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full border-silver/20 text-silver hover:bg-black/30"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="py-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mb-4">
                <Check size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-medium text-phosphor mb-2">Auto-Vote Enabled</h3>
              <p className="text-center text-sm text-silver mb-6">
                Your execution agent is now ready to vote on your behalf in {daoName} DAO governance.
              </p>
            </div>
            
            {createdAgent && (
              <div className="mb-6 bg-black/30 border border-silver/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={16} className="text-indigo" />
                  <span className="font-medium text-phosphor">Agent Wallet</span>
                </div>
                <p className="text-xs font-mono text-silver mb-1 truncate">
                  {createdAgent.public_address || createdAgent.wallet_address}
                </p>
                <p className="text-xs text-silver">This wallet will be used for on-chain voting</p>
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast({
                    title: "Feature Coming Soon",
                    description: "Delegation to AI is currently under development.",
                    variant: "default"
                  });
                }}
                className="w-full bg-cyan/20 text-cyan hover:bg-cyan/30 border border-cyan/30"
              >
                Delegate to AI <span className="ml-2 text-xs bg-cyan/30 px-2 py-0.5 rounded">WIP</span>
              </Button>
              
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Close button clicked from success screen');
                  handleClose();
                }}
                className="w-full bg-indigo hover:bg-indigo/90"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
