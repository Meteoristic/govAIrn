import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useAccount } from 'wagmi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // In development mode, skip auth check entirely
  const isDevelopmentMode = import.meta.env.DEV;
  
  useEffect(() => {
    // Skip authentication check in development mode
    if (isDevelopmentMode) {
      console.log("Development mode: Skipping authentication check");
      return;
    }
    
    // Only redirect if:
    // 1. We're done loading AND
    // 2. User is not authenticated AND 
    // 3. Wallet is not connected
    if (!loading && !isAuthenticated && !isConnected) {
      console.log("Not authenticated and wallet not connected, redirecting to auth page");
      
      toast({
        title: "Authentication required",
        description: "Please connect your wallet to access this page",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [isAuthenticated, loading, navigate, toast, isConnected, isDevelopmentMode]);

  // Always allow access in development
  if (isDevelopmentMode) {
    return <>{children}</>;
  }
  
  // Show loading state only briefly while checking authentication
  // If wallet is connected but full auth not complete yet, show content anyway
  // This prevents the perpetual loading state
  if (loading && !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-phosphor text-xl">Loading...</div>
      </div>
    );
  }

  // Allow access if authenticated OR wallet is connected (auth might still be processing)
  return (isAuthenticated || isConnected) ? <>{children}</> : null;
};

export default ProtectedRoute;
