import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Vote, 
  Brain, 
  User, 
  History, 
  Settings,
  LogOut,
  Bell,
  Search,
  Database,
  MessageSquare,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useAuthModal } from "@/hooks/useAuthModal";
import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// NavItem component for sidebar navigation
const NavItem = ({ icon, label, href, onClick, disabled = false }: { 
  icon: React.ReactNode; 
  label: string; 
  href: string;
  onClick?: () => void;
  disabled?: boolean;
}) => {
  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-silver/50 cursor-not-allowed"
        onClick={onClick}
      >
        <div className="flex items-center justify-center">{icon}</div>
        <span>{label}</span>
      </div>
    );
  }
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-silver hover:text-phosphor hover:bg-white/5 transition-colors w-full text-left"
      >
        <div className="flex items-center justify-center">{icon}</div>
        <span>{label}</span>
      </button>
    );
  }
  
  return (
    <Link
      to={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-silver hover:text-phosphor hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center justify-center">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { isModalOpen, openAuthModal, closeAuthModal, checkAuthAccess } = useAuthModal();
  const [personaBadgeText, setPersonaBadgeText] = useState("Inactive Persona");
  
  // Set up persona badge (only for authenticated users)
  useEffect(() => {
    // Only run if user exists
    if (user) {
      // This would be replaced with actual persona state checking
      setTimeout(() => {
        const status = Math.random() > 0.5 ? "Active Persona" : "Persona Initialized";
        setPersonaBadgeText(status);
      }, 1000);
    }
  }, [user]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle protected navigation
  const handleProtectedNavigation = (feature: string, path: string) => {
    if (checkAuthAccess(feature)) {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-phosphor flex relative overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-black/30 backdrop-blur-md border-r border-silver/10 fixed h-screen z-10">
        <div className="p-6 border-b border-silver/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 flex items-center justify-center">
              <img src="/images/govairn-logo.png" alt="govAIrn Logo" className="w-full h-full" />
            </div>
            <h1 className="text-xl font-bold">
              <span className="text-phosphor">gov</span>
              <span style={{ color: '#505DFF' }}>AI</span>
              <span className="text-phosphor">rn</span>
            </h1>
          </Link>
        </div>

        {/* Sidebar content with navigation groups */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto flex flex-col h-full">
          {/* Navigation group */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">Navigation</h3>
            <div className="space-y-2">
              <NavItem icon={<LayoutDashboard size={18} />} label="Home" href="/dashboard" />
              
              {/* Always show navigation items but handle interaction based on auth state */}
              <NavItem 
                icon={<Database size={18} />} 
                label="DAOs" 
                href="/daos" 
                onClick={!isAuthenticated ? () => openAuthModal("DAO browsing") : undefined}
                disabled={!isAuthenticated}
              />
              <NavItem 
                icon={<Vote size={18} />} 
                label="Proposals" 
                href="/proposals" 
                onClick={!isAuthenticated ? () => openAuthModal("proposal browsing") : undefined}
                disabled={!isAuthenticated}
              />
            </div>
          </div>
          
          {/* Agent group */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">Agent</h3>
            <div className="space-y-2">
              <NavItem 
                icon={<User size={18} />} 
                label="Persona" 
                href="/my-persona" 
                onClick={!isAuthenticated ? () => openAuthModal("persona management") : undefined}
                disabled={!isAuthenticated}
              />
              <NavItem 
                icon={<Brain size={18} />} 
                label="Decision Agent" 
                href="/decision-agent" 
                onClick={!isAuthenticated ? () => openAuthModal("decision agent") : undefined}
                disabled={!isAuthenticated}
              />
              <NavItem 
                icon={<MessageSquare size={18} />} 
                label="Chat with Agent" 
                href="/agent/chat" 
                onClick={!isAuthenticated ? () => openAuthModal("agent chat") : undefined}
                disabled={!isAuthenticated}
              />
              <NavItem 
                icon={<History size={18} />} 
                label="Voting History" 
                href="/voting-history" 
                onClick={!isAuthenticated ? () => openAuthModal("voting history") : undefined}
                disabled={!isAuthenticated}
              />
            </div>
          </div>
          
          {/* System group - pushed to bottom with margin-top auto */}
          <div className="mt-auto mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">System</h3>
            <div className="space-y-2">
              <NavItem 
                icon={<Settings size={18} />} 
                label="Settings" 
                href="/settings" 
                onClick={!isAuthenticated ? () => openAuthModal("settings") : undefined}
                disabled={!isAuthenticated}
              />
            </div>
          </div>
        </nav>

        {/* User account section - always visible at bottom */}
        <div className="p-4 border-t border-silver/10">
          {isAuthenticated ? (
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start gap-3 text-silver hover:text-phosphor"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start gap-3 text-silver hover:text-phosphor"
              onClick={() => openAuthModal()}
            >
              <Wallet size={18} />
              <span>Connect Wallet</span>
            </Button>
          )}
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-md border-b border-silver/10 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex md:hidden items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-9 w-9 flex items-center justify-center">
                  <img src="/images/govairn-logo.png" alt="govAIrn Logo" className="w-full h-full" />
                </div>
                <h1 className="text-xl font-bold text-phosphor">gov<span style={{ color: '#505DFF' }}>AI</span>rn</h1>
              </Link>
            </div>

            <div className="hidden md:flex items-center w-full max-w-lg">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-silver" size={18} />
                <Input 
                  placeholder="Search proposals..." 
                  className="pl-10 bg-charcoal/40 backdrop-blur-md border-silver/10 text-phosphor placeholder:text-silver/50 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <div className="hidden md:flex items-center gap-2 rounded-full px-3 py-1 bg-indigo/10 border border-indigo/30 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-cyan animate-pulse-glow"></span>
                  <span className="text-xs font-medium text-cyan">{personaBadgeText}</span>
                </div>
              )}
              
              {isAuthenticated ? (
                <Button variant="ghost" size="icon" className="text-silver hover:text-phosphor relative">
                  <Bell size={18} />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-gold"></span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => openAuthModal()}
                  className="text-indigo border-indigo/30 hover:bg-indigo/10"
                  size="sm"
                >
                  <Wallet size={16} className="mr-2" />
                  Connect Wallet
                </Button>
              )}

              <div className="md:hidden">
                <Button variant="ghost" size="icon" className="text-silver hover:text-phosphor">
                  <Search size={18} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-charcoal relative">
          {children}
        </main>
        
        {/* Connect Wallet Modal */}
        <ConnectWalletModal 
          isOpen={isModalOpen} 
          onClose={closeAuthModal} 
          requiredFeature={undefined}
        />
      </div>
    </div>
  );
};

export default DashboardLayout;
