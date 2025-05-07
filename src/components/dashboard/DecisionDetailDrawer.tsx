
import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, History, Code, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  decisionId: string | null;
  showChainOfThought: boolean;
}

// Mock decision data (in a real app, you would fetch this based on the ID)
const decisionData = {
  "decision-1": {
    id: "decision-1",
    proposalId: "MIP-39",
    proposalTitle: "Treasury Diversification Strategy",
    timestamp: "2025-05-01T14:32:00Z",
    decision: "FOR",
    confidence: 87,
    policyMatch: 92,
    reasoning: "The proposal aligns with risk tolerance preferences and long-term treasury growth goals.",
    summary: "This proposal suggests diversifying the treasury by allocating 15% to stablecoins, 10% to ETH, and maintaining 75% in the protocol's native token. The diversification aligns with the moderate risk profile (50%) defined in the governance persona, while supporting long-term horizon goals (70%). The proposal has strong treasury growth implications that match the treasury growth bias (60%). The allocation percentages are conservative enough to maintain protocol stability.",
    timeline: [
      { time: "14:30:12", event: "Proposal received", details: "Proposal MIP-39 detected from governance forum" },
      { time: "14:30:45", event: "Content extraction", details: "Extracted key proposal parameters and context" },
      { time: "14:31:22", event: "Policy comparison", details: "Matched against governance persona parameters" },
      { time: "14:31:58", event: "Decision formulated", details: "FOR decision reached with 87% confidence" },
      { time: "14:32:00", event: "Decision logged", details: "Decision recorded to on-chain transaction queue" }
    ],
    chainOfThought: [
      "Step 1: Analyze proposal MIP-39 content for key parameters.",
      "Step 2: Treasury diversification matches moderate risk tolerance (user preference: 50%).",
      "Step 3: Long-term strategy aligns with time horizon preference (user preference: 70%).",
      "Step 4: Assess stabilizing effect on treasury against growth bias (user preference: 60%).",
      "Step 5: Determine majority alignment with governance persona settings.",
      "Step 6: Calculate confidence score based on policy match (87%).",
      "Step 7: Generate FOR recommendation based on overall alignment metrics."
    ],
    riskFactors: [
      { factor: "Market volatility exposure", level: "Low (15%)" },
      { factor: "Smart contract risk", level: "Minimal (5%)" },
      { factor: "Protocol dependency", level: "Medium (30%)" }
    ],
    rawJson: `{
  "proposalId": "MIP-39",
  "title": "Treasury Diversification Strategy",
  "category": "Treasury",
  "policyMatch": {
    "risk": { "value": 50, "match": 92 },
    "esg": { "value": 30, "match": 76 },
    "treasury": { "value": 60, "match": 98 },
    "horizon": { "value": 70, "match": 95 },
    "frequency": { "value": 40, "match": 100 }
  },
  "confidence": 87,
  "decision": "FOR",
  "rationale": "Treasury diversification aligns with moderate risk profile while supporting long-term protocol stability.",
  "timestamp": "2025-05-01T14:32:00Z",
  "execution": { "status": "pending", "gas": 120000 }
}`
  },
  // Add other decisions as needed
};

export const DecisionDetailDrawer: React.FC<DecisionDetailDrawerProps> = ({
  open,
  onClose,
  decisionId,
  showChainOfThought
}) => {
  const [activeTab, setActiveTab] = useState("summary");
  
  if (!decisionId) return null;
  
  const decision = decisionData[decisionId as keyof typeof decisionData];
  if (!decision) return null;
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case "FOR": return <Check className="h-5 w-5 text-emerald-400" />;
      case "AGAINST": return <X className="h-5 w-5 text-rose-400" />;
      default: return null;
    }
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent className="bg-charcoal border-t border-silver/10">
        <div className="max-w-4xl mx-auto w-full">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full",
                  decision.decision === "FOR" ? "bg-emerald-400/10" : "bg-rose-400/10"
                )}>
                  {getDecisionIcon(decision.decision)}
                </div>
                <DrawerTitle className="text-xl text-phosphor">{decision.proposalTitle}</DrawerTitle>
              </div>
              <div className="text-sm text-silver">
                {formatTime(decision.timestamp)}
              </div>
            </div>
            <DrawerDescription className="text-silver">
              Proposal ID: {decision.proposalId} • Confidence: {decision.confidence}% • Policy Match: {decision.policyMatch}%
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4">
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                {showChainOfThought && (
                  <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                )}
                <TabsTrigger value="json">Raw Data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="bg-graphite border border-silver/10 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-phosphor mb-2">Decision Summary</h3>
                  <p className="text-silver text-sm">{decision.summary}</p>
                </div>
                
                <div className="bg-graphite border border-silver/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="text-gold" size={16} />
                    <h3 className="text-sm font-medium text-phosphor">Risk Analysis</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {decision.riskFactors.map((risk, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-silver">{risk.factor}</span>
                        <span className="text-sm text-gold">{risk.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="timeline">
                <div className="bg-graphite border border-silver/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-cyan" />
                    <h3 className="text-sm font-medium text-phosphor">Decision Timeline</h3>
                  </div>
                  
                  <div className="space-y-0">
                    {decision.timeline.map((event, i) => (
                      <div key={i} className="relative pl-6 pb-6">
                        {/* Timeline dot and line */}
                        <div className="absolute left-0 top-0.5 h-3 w-3 rounded-full bg-indigo"></div>
                        {i < decision.timeline.length - 1 && (
                          <div className="absolute left-1.5 top-3 h-full w-px bg-indigo/30"></div>
                        )}
                        
                        {/* Event content */}
                        <div className="mb-1">
                          <h4 className="text-sm font-medium text-phosphor flex items-center gap-2">
                            {event.event}
                            <span className="text-xs text-silver font-normal">{event.time}</span>
                          </h4>
                          <p className="text-xs text-silver">{event.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              {showChainOfThought && (
                <TabsContent value="reasoning">
                  <div className="bg-graphite border border-silver/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Code size={16} className="text-cyan" />
                      <h3 className="text-sm font-medium text-phosphor">Chain of Thought</h3>
                    </div>
                    
                    <div className="space-y-2">
                      {decision.chainOfThought.map((step, i) => (
                        <div key={i} className="text-sm text-silver p-2 bg-black/20 rounded">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}
              
              <TabsContent value="json">
                <div className="bg-graphite border border-silver/10 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-phosphor mb-2">Raw Decision Data</h3>
                  <pre className="text-xs text-silver overflow-auto p-3 bg-black/30 rounded max-h-80">
                    {decision.rawJson}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <DrawerFooter>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} className="border-silver/20">
                Close
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
