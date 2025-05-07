import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { DaoService } from "@/lib/services/dao.service";

const AdminPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  
  const handleSeedUniswap = async () => {
    try {
      setLoading(true);
      setMessage("Seeding Uniswap DAO...");
      
      // This will trigger reseeding all ecosystem DAOs including Uniswap
      const result = await DaoService.seedBaseEcosystemDAOs();
      
      setMessage(`Successfully seeded DAOs! Added: ${result.added}, Updated: ${result.updated}, Failed: ${result.failed}`);
      setLoading(false);
    } catch (error) {
      console.error("Error seeding Uniswap DAO:", error);
      setMessage(`Error seeding Uniswap DAO: ${error}`);
      setLoading(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-phosphor mb-6">Admin Tools</h1>
        
        <div className="bg-charcoal/40 backdrop-blur-md rounded-xl p-6 border border-silver/10">
          <h2 className="text-xl font-semibold text-phosphor mb-4">DAO Management</h2>
          
          <div className="space-y-4">
            <Button 
              onClick={handleSeedUniswap} 
              disabled={loading}
              className="bg-indigo/20 text-indigo hover:bg-indigo/30 border border-indigo/30"
            >
              {loading ? "Processing..." : "Seed Base Ecosystem DAOs (incl. Uniswap)"}
            </Button>
            
            {message && (
              <div className={`p-4 rounded-lg ${message.includes("Error") ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                {message}
              </div>
            )}
          </div>
          
          <div className="mt-6 text-silver/70 text-sm">
            <p>Note: This action will sync all Base ecosystem DAOs with Snapshot data.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
