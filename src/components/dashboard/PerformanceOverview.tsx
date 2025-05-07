
import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { CardSpotlight } from "@/components/ui/card-spotlight";

const votesData = [
  { name: "Week 1", value: 8 },
  { name: "Week 2", value: 12 },
  { name: "Week 3", value: 5 },
  { name: "Week 4", value: 15 },
  { name: "Week 5", value: 18 },
  { name: "Week 6", value: 24 },
];

const alignmentData = [
  { name: "Week 1", value: 80 },
  { name: "Week 2", value: 85 },
  { name: "Week 3", value: 87 },
  { name: "Week 4", value: 84 },
  { name: "Week 5", value: 89 },
  { name: "Week 6", value: 92 },
];

const confidenceData = [
  { name: "Week 1", value: 75 },
  { name: "Week 2", value: 78 },
  { name: "Week 3", value: 82 },
  { name: "Week 4", value: 80 },
  { name: "Week 5", value: 84 },
  { name: "Week 6", value: 86 },
];

interface KPICardProps {
  title: string;
  value: string | number;
  change: string;
  positive?: boolean;
  chartData: any[];
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  positive = true,
  chartData,
  color
}) => {
  return (
    <div className="flex-1 p-4 rounded-lg backdrop-blur-md bg-charcoal/40 border border-silver/10 hover:border-silver/20 transition-all relative z-10">
      <h3 className="text-sm text-silver">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-phosphor">{value}</span>
        <span className={`text-xs ${positive ? 'text-teal' : 'text-gold'}`}>
          {change}
        </span>
      </div>
      
      <div className="h-14 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`color-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              fill={`url(#color-${title})`} 
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PerformanceOverview = () => {
  return (
    <CardSpotlight className="w-full p-6">
      <h2 className="text-xl font-bold text-phosphor mb-6 relative z-10">Performance Overview</h2>
      
      <div className="flex gap-4 relative z-10">
        <KPICard 
          title="Votes Cast (30d)" 
          value="24" 
          change="+12% vs. prev" 
          chartData={votesData}
          color="#5FFBF1"
        />
        
        <KPICard 
          title="Persona Alignment" 
          value="92%" 
          change="+4% since last update" 
          chartData={alignmentData}
          color="#FFD66B"
        />
        
        <KPICard 
          title="Avg. Confidence" 
          value="86%" 
          change="+5.3% since last month" 
          chartData={confidenceData}
          color="#2E8A7D"
        />
      </div>
    </CardSpotlight>
  );
};

export default PerformanceOverview;
