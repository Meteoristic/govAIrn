
import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProposalFeed from "@/components/dashboard/ProposalFeed";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterType = "all" | "active" | "queued" | "executed" | "missed" | "voted";

const Proposals = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Reference to the top of the page
  const topRef = useRef<HTMLDivElement>(null);
  
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
        
        <h1 className="text-3xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent">Proposals</h1>
        
        {/* Proposal toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-1 w-full md:w-auto md:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-silver" size={18} />
              <Input 
                placeholder="Search proposals..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-charcoal/40 backdrop-blur-md border-silver/10 text-phosphor placeholder:text-silver/50 rounded-xl w-full"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <FilterButton 
              active={filter === "all"} 
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>
            <FilterButton 
              active={filter === "active"} 
              onClick={() => setFilter("active")}
            >
              Active
            </FilterButton>
            <FilterButton 
              active={filter === "queued"} 
              onClick={() => setFilter("queued")}
            >
              Queued
            </FilterButton>
            <FilterButton 
              active={filter === "executed"} 
              onClick={() => setFilter("executed")}
            >
              Executed
            </FilterButton>
            <FilterButton 
              active={filter === "missed"} 
              onClick={() => setFilter("missed")}
            >
              Missed
            </FilterButton>
            <FilterButton 
              active={filter === "voted"} 
              onClick={() => setFilter("voted")}
            >
              Voted
            </FilterButton>
          </div>
        </div>
        
        <div className="animate-fade-in">
          <ProposalFeed />
        </div>
      </div>
    </DashboardLayout>
  );
};

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterButton = ({ active, onClick, children }: FilterButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`rounded-full px-4 border ${
        active
          ? "bg-indigo/20 text-indigo border-indigo/30"
          : "bg-transparent text-silver border-silver/20 hover:bg-black/20 hover:text-phosphor"
      }`}
    >
      {children}
    </Button>
  );
};

export default Proposals;
