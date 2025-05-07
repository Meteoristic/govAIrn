
import React from "react";
import { Brain, ExternalLink } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

const activities = [
  {
    id: "1",
    type: "evaluated",
    title: "Evaluated Proposal #87",
    time: "2 hours ago",
    confidence: 88,
    dao: "Base DAO",
  },
  {
    id: "2",
    type: "threshold",
    title: "Confidence Threshold Met",
    time: "1 day ago",
    confidence: 92,
    dao: "Optimism Governance",
  },
  {
    id: "3",
    type: "approval",
    title: "Auto-approval triggered",
    time: "2 days ago",
    confidence: 78,
    dao: "LRT Research",
  },
  {
    id: "4",
    type: "vote",
    title: "Vote Cast: YES",
    time: "3 days ago",
    confidence: 89,
    dao: "Base DeFi",
    txHash: "0x3f5e...2a7b",
  },
  {
    id: "5",
    type: "evaluated",
    title: "Evaluated Proposal #82",
    time: "5 days ago",
    confidence: 65,
    dao: "Arbitrum DAO",
  },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "evaluated":
      return <div className="w-2 h-2 rounded-full bg-cyan animate-pulse"></div>;
    case "vote":
      return <div className="w-2 h-2 rounded-full bg-teal"></div>;
    case "threshold":
      return <div className="w-2 h-2 rounded-full bg-gold"></div>;
    case "approval":
      return <div className="w-2 h-2 rounded-full bg-indigo"></div>;
    default:
      return <div className="w-2 h-2 rounded-full bg-silver"></div>;
  }
};

const AgentActivity = () => {
  return (
    <CardSpotlight className="w-full p-6">
      <h2 className="text-xl font-bold text-phosphor mb-6 relative z-10">Agent Activity</h2>
      
      <div className="relative">
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-silver/20"></div>
        
        <div className="space-y-4 relative z-10">
          {activities.map((activity) => (
            <div key={activity.id} className="pl-5 relative">
              <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-charcoal flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-phosphor">{activity.title}</h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-silver">{activity.time}</span>
                  {activity.confidence && (
                    <span className="text-xs text-cyan">
                      {activity.confidence}% confidence
                    </span>
                  )}
                </div>
                
                {activity.txHash && (
                  <a 
                    href={`https://basescan.org/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo hover:text-indigo/80 flex items-center gap-1 mt-1"
                  >
                    View on BaseScan <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardSpotlight>
  );
};

export default AgentActivity;
