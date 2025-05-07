
import React, { useState, useEffect } from 'react';
import { SnappySlider } from '@/components/ui/snappy-slider';
import { motion } from 'framer-motion';
import { PersonaValues } from '@/types/persona';
import PolicySummary from '@/components/dashboard/PolicySummary';

interface PersonaBuilderProps {
  initialValues: PersonaValues;
  onUpdate?: (values: PersonaValues) => void;
  isLoading?: boolean;
  showSaveButton?: boolean;
}

const PersonaBuilder: React.FC<PersonaBuilderProps> = ({ 
  initialValues, 
  onUpdate, 
  isLoading = false,
  showSaveButton = false 
}) => {
  const [sliderValues, setSliderValues] = useState<PersonaValues>({
    risk: initialValues.risk || 50,
    esg: initialValues.esg || 50,
    treasury: initialValues.treasury || 60,
    horizon: initialValues.horizon || 50,
    frequency: initialValues.frequency || 50
  });

  // Update slider values when initialValues change
  useEffect(() => {
    if (initialValues) {
      setSliderValues({
        risk: initialValues.risk || 50,
        esg: initialValues.esg || 50,
        treasury: initialValues.treasury || 60,
        horizon: initialValues.horizon || 50,
        frequency: initialValues.frequency || 50
      });
    }
  }, [initialValues]);

  const handleSliderChange = (id: keyof PersonaValues, newValue: number) => {
    setSliderValues(prev => ({
      ...prev,
      [id]: newValue
    }));
  };

  const handleSubmit = () => {
    if (onUpdate) {
      onUpdate(sliderValues);
    }
  };

  const sliderConfig = [
    {
      id: 'risk',
      label: 'Risk Tolerance',
      leftLabel: 'Conservative',
      rightLabel: 'Aggressive',
      value: sliderValues.risk,
      snapPoints: [0, 25, 50, 75, 100],
      tooltip: 'How much risk you\'re willing to take in governance decisions'
    },
    {
      id: 'esg',
      label: 'ESG Weight',
      leftLabel: 'Growth Focus',
      rightLabel: 'Impact Focus',
      value: sliderValues.esg,
      snapPoints: [0, 25, 50, 75, 100],
      tooltip: 'Priority given to environmental, social, and governance factors'
    },
    {
      id: 'treasury',
      label: 'Treasury Growth Bias',
      leftLabel: 'Preserve',
      rightLabel: 'Expand',
      value: sliderValues.treasury,
      snapPoints: [0, 25, 50, 75, 100],
      tooltip: 'Preference between treasury preservation and growth'
    },
    {
      id: 'horizon',
      label: 'Time Horizon',
      leftLabel: 'Short-Term',
      rightLabel: 'Long-Term',
      value: sliderValues.horizon,
      snapPoints: [0, 25, 50, 75, 100],
      tooltip: 'Preference for short-term vs long-term decision making'
    },
    {
      id: 'frequency',
      label: 'Vote Frequency Limit',
      leftLabel: 'Rare',
      rightLabel: 'Active',
      value: sliderValues.frequency,
      snapPoints: [0, 25, 50, 75, 100],
      tooltip: 'How frequently your agent should participate in voting'
    }
  ];

  return (
    <section className="w-full py-16 px-4 bg-graphite/20">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Shape Your Voting Philosophy</h2>
        </motion.div>
        
        <div className="bg-charcoal/70 backdrop-blur-sm border border-silver/10 rounded-xl p-6 md:p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-phosphor">PersonaSliderGroup</h3>
            
            {sliderConfig.map((slider) => (
              <div key={slider.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg text-silver">{slider.label}</h4>
                  <div className="text-sm text-silver/70">{slider.value}%</div>
                </div>
                
                <div className="space-y-1">
                  <SnappySlider
                    values={slider.snapPoints}
                    defaultValue={slider.value}
                    value={slider.value}
                    onChange={(value) => handleSliderChange(slider.id as keyof PersonaValues, value)}
                    min={0}
                    max={100}
                    step={1}
                    label={slider.label}
                    suffix="%"
                    className="py-1"
                  />
                  <div className="flex justify-between text-silver text-sm mt-1 px-1">
                    <span>{slider.leftLabel}</span>
                    <span>{slider.rightLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-4">
            <h3 className="text-xl font-medium text-phosphor mb-4">PersonaSummaryPreview</h3>
            <PolicySummary sliders={sliderValues} />
          </div>
          
          {showSaveButton && (
            <div className="pt-6">
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-indigo hover:bg-indigo/90 text-phosphor text-lg py-4 px-8 rounded-lg transition-all duration-300"
              >
                {isLoading ? 'Saving...' : 'Save Persona'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PersonaBuilder;
