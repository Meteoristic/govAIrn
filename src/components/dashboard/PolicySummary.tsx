
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { PersonaValues } from "@/types/persona";

interface PolicySummaryProps {
  sliders: PersonaValues;
}

const PolicySummary = ({ sliders }: PolicySummaryProps) => {
  // Generate a natural language summary based on slider values
  const summary = useMemo(() => {
    const risk = sliders.risk || 0;
    const esg = sliders.esg || 0;
    const treasury = sliders.treasury || 0;
    const horizon = sliders.horizon || 0;
    const frequency = sliders.frequency || 0;

    const riskDesc = risk < 33 ? "conservative" : risk > 66 ? "aggressive" : "moderate";
    const esgDesc = esg < 33 ? "minimal" : esg > 66 ? "significant" : "moderate";
    const treasuryDesc = treasury < 33 ? "stability-focused" : treasury > 66 ? "expansion-focused" : "balanced";
    const horizonDesc = horizon < 33 ? "short-term" : horizon > 66 ? "long-term" : "medium-term";
    const frequencyDesc = frequency < 33 ? "selective" : frequency > 66 ? "active" : "regular";
    
    return `You prefer ${horizonDesc} decisions with ${esgDesc} ESG weight, ${treasuryDesc} treasury strategy, and ${frequencyDesc} vote frequency.`;
  }, [sliders]);
  
  const strength = useMemo(() => {
    // Find what the user values most (highest slider value)
    const values = [sliders.risk, sliders.esg, sliders.treasury, sliders.horizon, sliders.frequency];
    const maxValue = Math.max(...values);
    const maxIndex = values.indexOf(maxValue);
    
    if (maxValue < 60) {
      return null; // No strong preference
    }
    
    let priority = "";
    let emphasis = "";
    
    switch (maxIndex) {
      case 0:
        priority = "Risk Tolerance";
        emphasis = "Higher Risk";
        break;
      case 1:
        priority = "ESG Considerations";
        emphasis = "Impact Focus";
        break;
      case 2:
        priority = "Treasury Growth";
        emphasis = "Expansion";
        break;
      case 3:
        priority = "Time Horizon";
        emphasis = "Long-Term Planning";
        break;
      case 4:
        priority = "Voting Frequency";
        emphasis = "Active Participation";
        break;
      default:
        priority = "Balanced Approach";
        emphasis = "All Factors";
    }
    
    return `Strongest priority: ${priority} (${emphasis})`;
  }, [sliders]);

  return (
    <motion.div 
      className="bg-graphite/70 border border-silver/10 rounded-2xl p-6 backdrop-blur-sm"
      key={summary}
      initial={{ opacity: 0.8, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-medium text-phosphor mb-2">Natural language output:</h2>
      <p className="text-silver leading-relaxed">"{summary}"</p>
      {strength && (
        <div className="mt-3 p-2 bg-indigo/10 border border-indigo/20 rounded-md inline-block">
          <p className="text-phosphor text-sm font-medium">{strength}</p>
        </div>
      )}
    </motion.div>
  );
};

export default PolicySummary;
