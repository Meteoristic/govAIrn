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
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { wallet, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [personaBadgeText, setPersonaBadgeText] = useState("Long-Term / High ESG");
  
  // Effect to load persona preferences from localStorage
  useEffect(() => {
    try {
      const storedPersona = localStorage.getItem('user_persona');
      if (storedPersona) {
        const persona = JSON.parse(storedPersona);
        
        // Generate badge text based on persona settings
        const timeHorizonText = persona.timeHorizon === 'long' ? 'Long-Term' : 
                                persona.timeHorizon === 'short' ? 'Short-Term' : 'Medium-Term';
        
        const esgText = persona.priorityFocus === 'security' ? 'High Security' :
                       persona.riskTolerance === 'conservative' ? 'Low Risk' :
                       persona.priorityFocus === 'innovation' ? 'Innovation' : 'High ESG';
        
        setPersonaBadgeText(`${timeHorizonText} / ${esgText}`);
      }
    } catch (error) {
      console.error("Error loading persona preferences:", error);
    }
  }, []);
  
  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/auth');
  };

  // Format wallet address for display: 0x1234...5678
  const formatWalletAddress = (address: string | null) => {
    if (!address) return "0x000...000";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-charcoal text-phosphor flex relative overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-black/30 backdrop-blur-md border-r border-silver/10 fixed h-screen z-10">
        <div className="p-6 border-b border-silver/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo/80 glow-indigo flex items-center justify-center">
              <span className="font-bold text-xl text-phosphor">g</span>
            </div>
            <h1 className="text-xl font-bold text-phosphor bg-clip-text bg-gradient-to-r from-phosphor to-phosphor/80 text-transparent">govAIrn</h1>
          </Link>
        </div>

        {/* Sidebar content with navigation groups */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto flex flex-col h-full">
          {/* Navigation group */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">Navigation</h3>
            <div className="space-y-2">
              <NavItem icon={<LayoutDashboard size={18} />} label="Home" href="/dashboard" />
              <NavItem icon={<Database size={18} />} label="DAOs" href="/daos" />
              <NavItem icon={<Vote size={18} />} label="Proposals" href="/proposals" />
            </div>
          </div>
          
          {/* Agent group */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">Agent</h3>
            <div className="space-y-2">
              <NavItem icon={<User size={18} />} label="Persona" href="/my-persona" />
              <NavItem icon={<Brain size={18} />} label="Decision Agent" href="/decision-agent" />
              <NavItem icon={<MessageSquare size={18} />} label="Chat with Agent" href="/agent/chat" />
              <NavItem icon={<History size={18} />} label="Voting History" href="/voting-history" />
            </div>
          </div>
          
          {/* System group - pushed to bottom with margin-top auto */}
          <div className="mt-auto mb-6">
            <h3 className="px-3 text-xs font-medium text-silver/70 uppercase tracking-wider mb-3">System</h3>
            <div className="space-y-2">
              <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
            </div>
          </div>
        </nav>

        {/* User account section - always visible at bottom */}
        <div className="p-4 border-t border-silver/10 sticky bottom-0 bg-black/30 backdrop-blur-md">
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 backdrop-blur-md border border-silver/10 hover:border-silver/20 transition-all">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-silver/20 flex items-center justify-center text-xs">
                0x
              </div>
              <div className="text-sm">
                <p className="text-phosphor font-medium">{formatWalletAddress(wallet)}</p>
                <p className="text-silver text-xs">Connected</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-silver hover:text-phosphor"
              onClick={handleLogout}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-md border-b border-silver/10 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex md:hidden items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo flex items-center justify-center">
                  <span className="font-bold text-xl text-phosphor">g</span>
                </div>
                <h1 className="text-xl font-bold text-phosphor">govAIrn</h1>
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
              <div className="hidden md:flex items-center gap-2 rounded-full px-3 py-1 bg-indigo/10 border border-indigo/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan animate-pulse-glow"></span>
                <span className="text-xs font-medium text-cyan">{personaBadgeText}</span>
              </div>
              
              <Button variant="ghost" size="icon" className="text-silver hover:text-phosphor relative">
                <Bell size={18} />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-gold"></span>
              </Button>

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
      </div>
    </div>
  );
};

// Helper component for navigation items
const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}> = ({ icon, label, href, active }) => {
  // Determine if this link matches the current location
  const isActive = window.location.pathname === href;

  return (
    <Link
      to={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
        active || isActive
          ? "bg-indigo/10 text-indigo border border-indigo/20"
          : "text-silver hover:bg-black/20 hover:text-phosphor border border-transparent"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
};

export default DashboardLayout;
