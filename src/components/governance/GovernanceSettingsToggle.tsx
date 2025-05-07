import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import governanceMetricsService from '@/lib/services/governance-metrics.service';

interface GovernanceSettingsToggleProps {
  onChange?: (useAI: boolean) => void;
}

/**
 * A toggle component that allows switching between basic and AI-based
 * governance metrics calculation methods.
 */
export default function GovernanceSettingsToggle({ onChange }: GovernanceSettingsToggleProps) {
  const [useAI, setUseAI] = useState<boolean>(false);

  // Update the metrics calculation strategy when the toggle changes
  const handleToggleChange = (checked: boolean) => {
    setUseAI(checked);
    governanceMetricsService.useAICalculator(checked);
    
    if (onChange) {
      onChange(checked);
    }
  };

  return (
    <div className="flex items-center space-x-4 bg-black/20 p-3 rounded-lg border border-silver/10">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-phosphor">Governance Metrics</h4>
        <p className="text-xs text-silver">
          {useAI 
            ? "Using AI-powered analytics for governance metrics" 
            : "Using basic analytics for governance metrics"}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-silver">Basic</span>
        <Switch 
          checked={useAI} 
          onCheckedChange={handleToggleChange} 
          className="data-[state=checked]:bg-indigo"
        />
        <span className="text-xs text-silver">AI</span>
      </div>
    </div>
  );
}
