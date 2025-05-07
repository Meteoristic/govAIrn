
import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentTraceList } from "@/components/dashboard/AgentTraceList";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DecisionDetailDrawer } from "@/components/dashboard/DecisionDetailDrawer";
import { Code, Brain, AlertTriangle, Settings, ChevronRight } from "lucide-react";

const DecisionAgent = () => {
  const [showChainOfThought, setShowChainOfThought] = useState(true);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectDecision = (decisionId: string) => {
    setSelectedDecisionId(decisionId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 relative">
        {/* Background gradients */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-[-10%] w-3/4 h-1/3 rounded-full bg-indigo/5 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-1/2 h-1/3 rounded-full bg-cyan/5 blur-[100px]" />
        </div>
      
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 grid-pattern opacity-10"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="animate-fade-in"
        >
          <h1 className="text-3xl font-bold text-phosphor bg-gradient-to-r from-phosphor via-phosphor to-silver/70 bg-clip-text text-transparent mb-6">Decision Agent</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="col-span-1">
              <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="text-indigo" size={20} />
                  <h2 className="text-lg font-medium text-phosphor">Agent Status</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-cyan animate-pulse"></div>
                    <span className="text-silver">Active & Processing</span>
                  </div>
                  
                  <div className="py-2 px-3 bg-black/30 rounded-lg border border-silver/10">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-silver">Processed Proposals</span>
                      <span className="text-xs text-phosphor font-medium">16</span>
                    </div>
                    <div className="w-full bg-graphite rounded-full h-1.5">
                      <div className="bg-cyan h-1.5 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  
                  <div className="py-2 px-3 bg-black/30 rounded-lg border border-silver/10">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-silver">Alignment Score</span>
                      <span className="text-xs text-phosphor font-medium">92%</span>
                    </div>
                    <div className="w-full bg-graphite rounded-full h-1.5">
                      <div className="bg-indigo h-1.5 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="chain-of-thought" className="text-sm text-silver flex items-center gap-1.5">
                      <Code size={16} />
                      Show Chain of Thought
                    </Label>
                    <Switch 
                      id="chain-of-thought" 
                      checked={showChainOfThought}
                      onCheckedChange={setShowChainOfThought}
                    />
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-silver/10">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="text-gold" size={18} />
                    <h3 className="text-sm font-medium text-phosphor">Risk Analysis</h3>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gold/5 border border-gold/20">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-silver">Risk of misalignment</span>
                      <span className="text-xs text-gold font-medium">8%</span>
                    </div>
                    <div className="w-full bg-graphite rounded-full h-1.5">
                      <div className="bg-gold h-1.5 rounded-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-span-1 lg:col-span-2">
              <Tabs defaultValue="recent" className="w-full h-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="bg-graphite/50">
                    <TabsTrigger value="recent">Recent Decisions</TabsTrigger>
                    <TabsTrigger value="important">Important</TabsTrigger>
                    <TabsTrigger value="all">All Traces</TabsTrigger>
                  </TabsList>
                  
                  <Button variant="outline" size="sm" className="text-xs border-silver/20 text-silver">
                    <Settings size={14} className="mr-2" />
                    Configure
                  </Button>
                </div>
                
                <TabsContent value="recent" className="mt-0">
                  <div className="bg-graphite border border-silver/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <AgentTraceList 
                      showChainOfThought={showChainOfThought} 
                      onSelectDecision={handleSelectDecision}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="important" className="mt-0">
                  <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-center h-64">
                    <div className="text-center text-silver">
                      <p>No important decisions to show</p>
                      <Button variant="link" className="mt-2 text-indigo">
                        Set importance criteria <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="all" className="mt-0">
                  <div className="bg-graphite border border-silver/10 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-center h-64">
                    <div className="text-center text-silver">
                      <p>View archive of all decision traces</p>
                      <Button variant="link" className="mt-2 text-indigo">
                        View all <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <DecisionDetailDrawer 
            open={drawerOpen} 
            onClose={handleCloseDrawer} 
            decisionId={selectedDecisionId} 
            showChainOfThought={showChainOfThought}
          />
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DecisionAgent;
