import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProposalFeed from "@/components/dashboard/ProposalFeed";
import PerformanceOverview from "@/components/dashboard/PerformanceOverview";
import AgentActivity from "@/components/dashboard/AgentActivity";
import { useAuth } from "@/context/AuthContext";
import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";
import { useAuthModal } from "@/hooks/useAuthModal";

const Dashboard = () => {
  // Reference to the top of the page
  const topRef = useRef<HTMLDivElement>(null);
  const { user, wallet } = useAuth();
  const { isModalOpen, requiredFeature, openAuthModal, closeAuthModal } = useAuthModal();
  
  // Scroll to the top when component mounts - using smooth scrolling
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "instant" });
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <DashboardLayout>
      <div ref={topRef} className="grid grid-cols-1 gap-8 p-6 relative">
        {/* Background gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
      
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 grid-pattern opacity-10"></div>
        
        <h1 className="text-3xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent">Dashboard Overview</h1>
        
        <div className="animate-fade-in">
          <PerformanceOverview />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-medium text-phosphor">Active Proposals</h2>
                {/* ProposalFeed controls will be rendered in their own container */}
              </div>
              <Link 
                to="/proposals" 
                className="text-indigo hover:text-indigo/80 text-sm font-medium flex items-center transition-colors"
              >
                View All
              </Link>
            </div>
            <ProposalFeed />
          </div>
          <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <AgentActivity />
          </div>
        </div>
        
        {/* Connect Wallet Modal */}
        <ConnectWalletModal 
          isOpen={isModalOpen} 
          onClose={closeAuthModal} 
          requiredFeature={requiredFeature}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
