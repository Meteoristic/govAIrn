
import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import DaoCardGrid from "@/components/daos/DaoCardGrid";

type FilterType = "all" | "active" | "delegated" | "base" | "high-activity";

const Daos = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-8 p-6 relative">
        {/* Background gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
      
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 grid-pattern opacity-10"></div>
        
        <h1 className="text-3xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent">Explore DAOs</h1>
        
        {/* DAO search and filter toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-1 w-full md:w-auto md:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-silver" size={18} />
              <Input 
                placeholder="Search DAOs..." 
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
              active={filter === "delegated"} 
              onClick={() => setFilter("delegated")}
            >
              Delegated
            </FilterButton>
            <FilterButton 
              active={filter === "base"} 
              onClick={() => setFilter("base")}
            >
              Base
            </FilterButton>
            <FilterButton 
              active={filter === "high-activity"} 
              onClick={() => setFilter("high-activity")}
            >
              High Activity
            </FilterButton>
          </div>
        </div>
        
        <div className="animate-fade-in">
          <DaoCardGrid searchQuery={searchQuery} filter={filter} />
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
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1 border text-sm transition-all ${
        active
          ? "bg-indigo/20 text-indigo border-indigo/30"
          : "bg-transparent text-silver border-silver/20 hover:bg-black/20 hover:text-phosphor"
      }`}
    >
      {children}
    </button>
  );
};

export default Daos;
