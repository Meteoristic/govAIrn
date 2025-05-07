
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Brain, Shield, ChevronRight, ChevronLeft } from 'lucide-react';
import RadialOrbitalTimeline from '@/components/ui/radial-orbital-timeline';
import { Button } from '@/components/ui/button';

const timelineData = [
  {
    id: 1,
    title: "Connect Wallet",
    date: "Step 1",
    content: "Link your wallet to begin the delegation process. govAIrn supports Base, Ethereum, and other EVM-compatible chains.",
    category: "Setup",
    icon: Calendar,
    relatedIds: [2],
    status: "completed" as const,
  },
  {
    id: 2,
    title: "Choose Your Persona",
    date: "Step 2",
    content: "Define your governance philosophy through a series of simple preference selections that guide your AI agent.",
    category: "Configuration",
    icon: User,
    relatedIds: [1, 3],
    status: "in-progress" as const,
  },
  {
    id: 3,
    title: "AI Analyzes Proposals",
    date: "Step 3",
    content: "Our Decision Agent reads and evaluates proposals based on your persona, generating summaries and recommendations.",
    category: "Analysis",
    icon: Brain,
    relatedIds: [2, 4],
    status: "in-progress" as const,
  },
  {
    id: 4,
    title: "Confirm & Vote",
    date: "Step 4",
    content: "Review the agent's recommendation and confirm. AgentKit handles the rest with gasless execution.",
    category: "Action",
    icon: Shield,
    relatedIds: [3],
    status: "pending" as const,
  }
];

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [viewType, setViewType] = useState<'orbital' | 'stepped'>('stepped');

  const handleNextStep = () => {
    if (activeStep < timelineData.length) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setActiveStep(stepId);
  };

  return (
    <section id="how-it-works" className="py-24 px-6 sm:px-12 md:px-16 lg:px-24 bg-gradient-to-b from-charcoal to-graphite relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
      
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl font-bold mb-6">How govAIrn Works</h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            From wallet connection to AI-powered voting, in just four simple steps.
          </p>
          
          <div className="flex justify-center mt-8 gap-4">
            <Button 
              variant="outline"
              className={`border-silver/30 ${viewType === 'stepped' ? 'bg-indigo/20 text-phosphor' : 'bg-transparent text-silver'}`}
              onClick={() => setViewType('stepped')}
            >
              Step-by-Step View
            </Button>
            <Button 
              variant="outline"
              className={`border-silver/30 ${viewType === 'orbital' ? 'bg-indigo/20 text-phosphor' : 'bg-transparent text-silver'}`}
              onClick={() => setViewType('orbital')}
            >
              Orbital View
            </Button>
          </div>
        </motion.div>

        {viewType === 'orbital' ? (
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7 }}
              className="w-full max-w-4xl mx-auto h-[600px]"
            >
              <RadialOrbitalTimeline timelineData={timelineData} />
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              viewport={{ once: true }}
              className="text-center text-silver/70 mt-6 max-w-xl mx-auto"
            >
              Click on any step to explore details and connections between steps in your governance journey.
            </motion.p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Step navigation indicators */}
            <div className="flex justify-center mb-12">
              {timelineData.map((step) => (
                <div key={step.id} className="flex items-center">
                  <div
                    onClick={() => handleStepClick(step.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all
                      ${activeStep === step.id ? 'bg-indigo text-graphite' : 'bg-graphite border border-silver/30 text-silver'}
                      ${step.id < activeStep ? 'bg-cyan/80 text-graphite' : ''}
                    `}
                  >
                    {step.id < activeStep ? <ChevronRight size={18} /> : step.id}
                  </div>
                  
                  {step.id < timelineData.length && (
                    <div 
                      className={`w-16 sm:w-24 h-0.5 transition-all duration-300
                        ${step.id < activeStep ? 'bg-cyan/80' : 'bg-silver/20'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Active step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-graphite border border-silver/10 rounded-2xl p-8 sm:p-10 backdrop-blur-sm shadow-xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo/20 flex items-center justify-center">
                      {React.createElement(timelineData[activeStep-1].icon, { size: 24, className: 'text-indigo' })}
                    </div>
                    <div>
                      <h3 className="text-phosphor text-2xl font-semibold">
                        {timelineData[activeStep-1].title}
                      </h3>
                      <span className="text-silver/70 text-sm">
                        {timelineData[activeStep-1].date}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-silver text-lg leading-relaxed mb-8">
                  {timelineData[activeStep-1].content}
                </p>

                <div className="mt-10 flex items-center justify-between">
                  <Button
                    onClick={handlePrevStep}
                    disabled={activeStep === 1}
                    className={`bg-indigo hover:bg-indigo/90 text-phosphor ${activeStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft className="mr-2" size={16} />
                    Previous Step
                  </Button>

                  <div className="w-full max-w-xs mx-4">
                    <div className="h-1.5 w-full bg-graphite/80 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan to-indigo transition-all duration-700"
                        style={{ width: `${(activeStep / timelineData.length) * 100}%` }}
                      />
                    </div>
                    <div className="text-center text-sm text-silver/70 mt-2">
                      Step {activeStep} of {timelineData.length}
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={activeStep === timelineData.length}
                    className={`bg-indigo hover:bg-indigo/90 text-phosphor ${activeStep === timelineData.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {activeStep === timelineData.length ? 'Complete' : 'Next Step'}
                    {activeStep < timelineData.length && <ChevronRight className="ml-2" size={16} />}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowItWorks;
