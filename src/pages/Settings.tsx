import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, LogOut, Shield, ShieldCheck, Database, Globe, LockIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import SupabaseTest from "@/components/test/SupabaseTest";
import SeedDAOs from "@/components/settings/SnapshotIntegration";
import { useAuthModal } from "@/hooks/useAuthModal";
import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";

const Settings = () => {
  const { toast } = useToast();
  const { logout, wallet, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { openAuthModal, isModalOpen, closeAuthModal } = useAuthModal();
  
  // Add console log to debug user object
  React.useEffect(() => {
    if (user) {
      console.log("User object in Settings:", user);
    }
  }, [user]);
  
  const [notifications, setNotifications] = React.useState({
    aiVoteCast: true,
    lowConfidenceWarning: true,
  });
  
  // Mock data - replace with your backend implementation
  const walletAddress = wallet || "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b";
  const isVerifiedDelegate = true;
  const hasActiveDelegation = true;
  
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast({
      title: "Notification settings updated",
      description: `${key} notifications ${notifications[key] ? "disabled" : "enabled"}`,
    });
  };
  
  const handleDisconnectWallet = async () => {
    await logout();
    
    toast({
      title: "Wallet disconnected",
      description: "You have been logged out",
    });
    
    navigate('/auth');
  };

  // If not authenticated, show a simple message
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
          <Card className="bg-black/30 backdrop-blur-md border-silver/10">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <LockIcon className="h-12 w-12 text-indigo opacity-70" />
              </div>
              <CardTitle className="text-phosphor text-center">Authentication Required</CardTitle>
              <CardDescription className="text-silver text-center">
                You need to connect your wallet and sign in to access settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                variant="default" 
                className="bg-indigo hover:bg-indigo/90"
                onClick={() => openAuthModal("settings")}
              >
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
          
          {/* Connect Wallet Modal */}
          <ConnectWalletModal 
            isOpen={isModalOpen} 
            onClose={closeAuthModal} 
            requiredFeature="settings"
          />
        </div>
      </DashboardLayout>
    );
  }

  // Normal render for authenticated users
  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-phosphor">Settings</h1>
          <p className="text-silver mt-2">Manage your preferences and wallet connection</p>
        </div>
        
        {/* Notification Settings */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <CardTitle className="text-phosphor">Notifications</CardTitle>
            <CardDescription className="text-silver">Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-indigo" />
                  <Label htmlFor="ai-vote-cast" className="text-phosphor font-medium">AI Vote Cast</Label>
                </div>
                <p className="text-sm text-silver">Receive notifications when your AI casts a vote</p>
              </div>
              <Switch 
                id="ai-vote-cast" 
                checked={notifications.aiVoteCast} 
                onCheckedChange={() => handleNotificationToggle("aiVoteCast")}
                className="data-[state=checked]:bg-indigo"
              />
            </div>
            
            <Separator className="bg-silver/10" />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BellOff className="h-5 w-5 text-gold" />
                  <Label htmlFor="low-confidence-warning" className="text-phosphor font-medium">Low Confidence Warning</Label>
                </div>
                <p className="text-sm text-silver">Get alerted when AI has low confidence in a vote decision</p>
              </div>
              <Switch 
                id="low-confidence-warning" 
                checked={notifications.lowConfidenceWarning} 
                onCheckedChange={() => handleNotificationToggle("lowConfidenceWarning")}
                className="data-[state=checked]:bg-indigo"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* User Details Card */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <CardTitle className="text-phosphor">User Details</CardTitle>
            <CardDescription className="text-silver">View your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User ID */}
            <div className="space-y-2">
              <Label className="text-silver">User ID</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-silver/10">
                <div className="h-8 w-8 rounded-full bg-cyan/20 flex items-center justify-center text-xs">
                  ID
                </div>
                <p className="text-phosphor font-mono overflow-x-auto text-sm">
                  {user?.id || 
                   user?.user_metadata?.supabase_id || 
                   user?.app_metadata?.provider_id || 
                   "Not authenticated"}
                </p>
              </div>
            </div>
            
            {/* Wallet Address */}
            <div className="space-y-2">
              <Label className="text-silver">Primary Wallet</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-silver/10">
                <div className="h-8 w-8 rounded-full bg-indigo/20 flex items-center justify-center text-xs">
                  0x
                </div>
                <p className="text-phosphor font-mono overflow-x-auto text-sm">
                  {wallet || user?.user_metadata?.wallet || "No wallet connected"}
                </p>
              </div>
            </div>
            
            {/* Authentication Status */}
            <div className="space-y-2">
              <Label className="text-silver">Authentication Status</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-silver/10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${user ? "bg-teal/20" : "bg-red-900/20"}`}>
                    <ShieldCheck className={`h-5 w-5 ${user ? "text-teal" : "text-red-400"}`} />
                  </div>
                  <div>
                    <p className="text-phosphor font-medium">
                      {user ? "Authenticated" : "Not Authenticated"}
                    </p>
                    <p className="text-sm text-silver">
                      {user 
                        ? "You are signed in with Ethereum" 
                        : "Connect your wallet and sign in to access all features"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Proposal Source Integration */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo" />
              <CardTitle className="text-phosphor">Seed DAOs</CardTitle>
            </div>
            <CardDescription className="text-silver">Seed and sync DAOs from Snapshot spaces</CardDescription>
          </CardHeader>
          <CardContent>
            <SeedDAOs />
          </CardContent>
        </Card>
        
        {/* Database Connection Card */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo" />
              <CardTitle className="text-phosphor">Database Connection</CardTitle>
            </div>
            <CardDescription className="text-silver">Test your connection to the Supabase backend</CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseTest />
          </CardContent>
        </Card>
        
        {/* Wallet Management */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <CardTitle className="text-phosphor">Wallet Management</CardTitle>
            <CardDescription className="text-silver">Manage your connected wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-silver">Connected Address</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-silver/10">
                <div className="h-8 w-8 rounded-full bg-indigo/20 flex items-center justify-center text-xs">
                  0x
                </div>
                <p className="text-phosphor font-mono">{walletAddress}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="border-silver/20 hover:bg-red-900/20 hover:text-red-400 w-full"
              onClick={handleDisconnectWallet}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect Wallet
            </Button>
          </CardContent>
        </Card>
        
        {/* AgentKit Status */}
        <Card className="bg-black/30 backdrop-blur-md border-silver/10">
          <CardHeader>
            <CardTitle className="text-phosphor">AgentKit Status</CardTitle>
            <CardDescription className="text-silver">View your delegation status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-silver/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isVerifiedDelegate ? "bg-teal/20" : "bg-graphite/50"}`}>
                  {isVerifiedDelegate ? (
                    <ShieldCheck className="h-5 w-5 text-cyan" />
                  ) : (
                    <Shield className="h-5 w-5 text-silver/60" />
                  )}
                </div>
                <div>
                  <h3 className="text-phosphor font-medium">Verified Delegate</h3>
                  <p className="text-sm text-silver">Your identity has been verified on-chain</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${isVerifiedDelegate ? "text-cyan" : "text-silver/60"}`}>
                {isVerifiedDelegate ? "✅" : "❌"}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-silver/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${hasActiveDelegation ? "bg-indigo/20" : "bg-graphite/50"}`}>
                  {hasActiveDelegation ? (
                    <ShieldCheck className="h-5 w-5 text-indigo" />
                  ) : (
                    <Shield className="h-5 w-5 text-silver/60" />
                  )}
                </div>
                <div>
                  <h3 className="text-phosphor font-medium">Active Delegation</h3>
                  <p className="text-sm text-silver">Your delegation is active and working</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${hasActiveDelegation ? "text-indigo" : "text-silver/60"}`}>
                {hasActiveDelegation ? "✅" : "❌"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
