
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentTraceListProps {
  showChainOfThought: boolean;
  onSelectDecision: (decisionId: string) => void;
}

// Mock data for agent decisions
const agentDecisions = [
  {
    id: "decision-1",
    proposalId: "MIP-39",
    proposalTitle: "Treasury Diversification Strategy",
    timestamp: "2025-05-01T14:32:00Z",
    decision: "FOR",
    confidence: 87,
    policyMatch: 92,
    status: "complete",
    reasoning: "The proposal aligns with risk tolerance preferences and long-term treasury growth goals.",
    tags: ["treasury", "high-match"]
  },
  {
    id: "decision-2",
    proposalId: "PIP-217",
    proposalTitle: "Carbon Offset Initiative",
    timestamp: "2025-05-01T13:15:00Z",
    decision: "FOR",
    confidence: 94,
    policyMatch: 98,
    status: "complete",
    reasoning: "Strong alignment with ESG priorities and long-term horizon goals.",
    tags: ["esg", "perfect-match"]
  },
  {
    id: "decision-3",
    proposalId: "GCP-53",
    proposalTitle: "Emergency Protocol Update",
    timestamp: "2025-05-01T10:48:00Z",
    decision: "AGAINST",
    confidence: 76,
    policyMatch: 68,
    status: "complete",
    reasoning: "Risk assessment exceeds tolerance threshold defined in governance persona.",
    tags: ["protocol", "security"]
  },
  {
    id: "decision-4",
    proposalId: "MIP-40",
    proposalTitle: "DeFi Integration Partnership",
    timestamp: "2025-05-01T09:20:00Z",
    status: "processing",
    tags: ["partnership", "integrations"]
  }
];

export const AgentTraceList: React.FC<AgentTraceListProps> = ({ 
  showChainOfThought, 
  onSelectDecision 
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "FOR": return "text-emerald-400";
      case "AGAINST": return "text-rose-400";
      case "ABSTAIN": return "text-amber-400";
      default: return "text-silver";
    }
  };
  
  const getDecisionBg = (decision: string) => {
    switch (decision) {
      case "FOR": return "bg-emerald-400/10";
      case "AGAINST": return "bg-rose-400/10";
      case "ABSTAIN": return "bg-amber-400/10";
      default: return "bg-silver/10";
    }
  };

  return (
    <div className="divide-y divide-silver/10">
      {agentDecisions.map((decision) => (
        <motion.div
          key={decision.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 hover:bg-black/20 transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-medium text-phosphor flex items-center gap-2">
                {decision.proposalId}
                <span className="h-1 w-1 rounded-full bg-silver/40"></span>
                <span className="text-silver font-normal">{formatTime(decision.timestamp)}</span>
              </h3>
              <p className="text-base font-medium text-phosphor mt-1">{decision.proposalTitle}</p>
            </div>
            
            <div className="flex flex-col items-end">
              {decision.status === "complete" ? (
                <div className={`px-3 py-1 rounded-full ${getDecisionBg(decision.decision)}`}>
                  <span className={`text-sm font-medium ${getDecisionColor(decision.decision)}`}>
                    {decision.decision}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="gap-1 text-cyan border-cyan/30 bg-cyan/10">
                  <Loader2 size={12} className="animate-spin" />
                  Processing
                </Badge>
              )}
              
              {decision.confidence && (
                <div className="mt-1 text-sm text-silver">
                  {decision.confidence}% confidence
                </div>
              )}
            </div>
          </div>
          
          {decision.status === "complete" && (
            <>
              <div className="mt-3 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-silver">Policy match</span>
                  <span className="text-xs font-medium text-phosphor">{decision.policyMatch}%</span>
                </div>
                <div className="w-full bg-graphite rounded-full h-1">
                  <div 
                    className="bg-indigo h-1 rounded-full" 
                    style={{ width: `${decision.policyMatch}%` }}
                  ></div>
                </div>
              </div>
              
              {showChainOfThought && (
                <div className="mt-3 p-2 bg-black/20 rounded border border-silver/10 text-xs text-silver">
                  <p>{decision.reasoning}</p>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex gap-1">
              {decision.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-silver/5 border-silver/20">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs text-silver hover:text-phosphor"
              onClick={() => decision.status === "complete" && onSelectDecision(decision.id)}
              disabled={decision.status !== "complete"}
            >
              View details
              <ArrowUpRight size={12} className="ml-1" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
