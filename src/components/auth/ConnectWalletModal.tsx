import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requiredFeature?: string;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  title = "Connect Your Wallet",
  description = "Connect your wallet to access all features",
  requiredFeature
}) => {
  const { isConnected, address } = useAccount();
  const { isAuthenticated, signInWithEthereum, loading, error } = useAuth();
  const [showSignInButton, setShowSignInButton] = useState(false);
  
  // Close the modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, onClose]);
  
  // Show sign-in button once wallet is connected
  useEffect(() => {
    if (isConnected) {
      setShowSignInButton(true);
    } else {
      setShowSignInButton(false);
    }
  }, [isConnected]);
  
  const getMessage = () => {
    if (requiredFeature) {
      return `You need to connect your wallet to access ${requiredFeature}`;
    }
    
    if (!isConnected) {
      return "Connect your wallet to access all features.";
    }
    
    if (isConnected && !isAuthenticated) {
      return "Please sign the message to verify ownership of your wallet.";
    }
    
    return description;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-black/30 backdrop-blur-md border-silver/10 shadow-glow-sm">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
        
        <DialogHeader>
          <DialogTitle className="text-phosphor text-xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-silver">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          {/* Rainbow Kit Connect Button - Custom container to match style */}
          <div className="flex justify-center p-1 bg-charcoal/40 rounded-lg border border-silver/10">
            <ConnectButton showBalance={false} />
          </div>
          
          {/* Sign In With Ethereum Button */}
          {showSignInButton && !isAuthenticated && (
            <div className="flex flex-col space-y-4">
              <Button 
                onClick={() => signInWithEthereum()}
                disabled={loading}
                className="w-full bg-indigo hover:bg-indigo/90 text-phosphor"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In With Ethereum"
                )}
              </Button>
              
              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-400/30 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error signing in: {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 