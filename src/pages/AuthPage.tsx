import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AuthPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { 
    isAuthenticated, 
    signInWithEthereum, 
    wallet, 
    user, 
    loading, 
    status, 
    error 
  } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const handleSignIn = async () => {
    try {
      await signInWithEthereum();
      navigate('/dashboard');
    } catch (err) {
      console.error('Error during authentication:', err);
      // Error state is handled in AuthContext
    }
  };
  
  // Determine the message to show based on connection and authentication state
  const getMessage = () => {
    if (!isConnected) {
      return 'Please connect your wallet to sign in.';
    }
    
    if (loading) {
      switch (status) {
        case 'SIGNING':
          return 'Wallet connected. Please sign the message to complete authentication.';
        case 'VERIFYING':
          return 'Signature received. Verifying authentication...';
        default:
          return 'Loading...';
      }
    }
    
    if (isConnected && !isAuthenticated) {
      return 'Wallet connected. Please sign in with Ethereum.';
    }
    
    return '';
  };
  
  return (
    <div className="container mx-auto max-w-md mt-20 px-4">
      <div className="bg-charcoal/50 rounded-xl border border-silver/10 backdrop-blur-lg p-8 shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo flex items-center justify-center">
              <span className="font-bold text-xl text-phosphor">g</span>
            </div>
            <h1 className="text-2xl font-bold text-phosphor">govAIrn</h1>
          </div>
          
          <h2 className="text-xl font-semibold text-center text-phosphor">
            Sign In to GovAIrn
          </h2>
          
          <p className="text-silver text-center">
            Connect your wallet to access your governance profile.
          </p>
          
          <div className="my-2">
            <ConnectButton />
          </div>
          
          {getMessage() && (
            <p className="text-sm text-silver/80 text-center">
              {getMessage()}
            </p>
          )}
          
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {isConnected && !isAuthenticated && (
            <GradientButton
              onClick={handleSignIn}
              disabled={loading || !isConnected}
              className="w-full mt-2"
              size="lg"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign-In with Ethereum
            </GradientButton>
          )}
          
          {/* Debug info section - useful during development */}
          <div className="w-full mt-6 p-4 rounded-lg bg-charcoal/30 border border-silver/10 text-xs">
            <p className="uppercase text-silver/50 text-xs tracking-wider mb-2">
              Debug Info
            </p>
            <pre className="whitespace-pre-wrap text-silver/70 font-mono text-xs">
              Connected: {isConnected ? 'Yes' : 'No'}
              <br />
              Authenticated: {isAuthenticated ? 'Yes' : 'No'}
              <br />
              Loading: {loading ? 'Yes' : 'No'}
              <br />
              Auth Status: {status}
              <br />
              Wallet: {wallet || 'None'}
              <br />
              User ID: {user?.id || 'None'}
              <br />
              Error: {error || 'None'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
