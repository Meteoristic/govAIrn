
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Transparency = () => {
  const [activeTab, setActiveTab] = useState('json');

  return (
    <section className="py-24 px-6 sm:px-12 md:px-16 lg:px-24 bg-gradient-to-b from-charcoal to-graphite relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal/5 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6">Transparent & Verifiable</h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            Inspect the AI agent's reasoning process and the on-chain execution data. Full transparency at every step.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-graphite/50 border border-silver/10 rounded-2xl p-8 backdrop-blur-sm"
        >
          <Tabs defaultValue="json" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-charcoal mb-6">
              <TabsTrigger value="json">JSON Output</TabsTrigger>
              <TabsTrigger value="thought">Chain-of-Thought</TabsTrigger>
            </TabsList>
            <TabsContent value="json" className="mt-0">
              <div className="bg-charcoal rounded-lg p-4 font-mono text-sm text-silver overflow-auto max-h-96">
                <pre>{`{
  "decision": {
    "proposalId": "0x3a7c9d67bf34625",
    "vote": "FOR",
    "confidence": 0.92,
    "rationale": "Aligns with treasury diversification goals and risk tolerance settings."
  },
  "alignment": {
    "riskTolerance": 0.86,
    "esgImpact": 0.73,
    "treasuryGrowth": 0.94,
    "longTermValue": 0.88
  },
  "calldata": "0x7ff36ab500000000000000000000000000000000000000000000000011adf2e15bcc0000",
  "gasEstimate": {
    "wei": "12500000000000000",
    "usd": "$0.32"
  },
  "timestamp": 1714866123
}`}</pre>
              </div>
            </TabsContent>
            <TabsContent value="thought" className="mt-0">
              <div className="bg-charcoal rounded-lg p-4 text-sm text-silver overflow-auto max-h-96">
                <h4 className="font-medium text-phosphor mb-3">Chain-of-Thought Analysis</h4>
                <ol className="space-y-3 list-decimal list-inside">
                  <li>Analyzed proposal #0x3a7c9d67bf34625 - Treasury Diversification Strategy</li>
                  <li>Extracted core parameters: 15% allocation to stablecoins, 8% to yield instruments</li>
                  <li>Compared against user risk profile (moderate-conservative at 50/100)</li>
                  <li>Evaluated ESG impact (neutral/positive - no fossil fuel exposure)</li>
                  <li>Projected treasury growth impact over 1yr, 3yr, 5yr timeframes</li>
                  <li>Weighed against similar proposals in comparable DAOs</li>
                  <li>Simulated market volatility scenarios against allocation</li>
                  <li>Conclusion: Proposal aligns with user preferences (92% confidence)</li>
                </ol>
                <div className="mt-4 pt-4 border-t border-silver/10">
                  <h4 className="font-medium text-phosphor mb-2">Alignment Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Risk Tolerance</span>
                        <span className="text-cyan">86%</span>
                      </div>
                      <div className="h-1.5 bg-charcoal/50 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan rounded-full" style={{ width: '86%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>ESG Impact</span>
                        <span className="text-gold">73%</span>
                      </div>
                      <div className="h-1.5 bg-charcoal/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: '73%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Treasury Growth</span>
                        <span className="text-indigo">94%</span>
                      </div>
                      <div className="h-1.5 bg-charcoal/50 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo rounded-full" style={{ width: '94%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Long Term Value</span>
                        <span className="text-teal">88%</span>
                      </div>
                      <div className="h-1.5 bg-charcoal/50 rounded-full overflow-hidden">
                        <div className="h-full bg-teal rounded-full" style={{ width: '88%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="border-teal/50 text-teal hover:bg-teal/10 transition-colors flex gap-2 items-center">
              <span>View on BaseScan</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8.66667V12C12 12.3536 11.8595 12.6928 11.6095 12.9428C11.3594 13.1929 11.0203 13.3333 10.6667 13.3333H4C3.64638 13.3333 3.30724 13.1929 3.05719 12.9428C2.80714 12.6928 2.66667 12.3536 2.66667 12V5.33333C2.66667 4.97971 2.80714 4.64057 3.05719 4.39052C3.30724 4.14048 3.64638 4 4 4H7.33333" stroke="#2E8A7D" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 2.66667H13.3333V6.00001" stroke="#2E8A7D" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.66667 9.33333L13.3333 2.66667" stroke="#2E8A7D" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </Button>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12 bg-charcoal border border-silver/10 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Need to Opt-Out?</h3>
              <p className="text-silver">Reset delegation anytime. Your sovereign control is always just one click away.</p>
            </div>
            <Button variant="outline" className="border-silver/30 text-silver hover:border-teal hover:text-teal transition-all min-w-40">
              Revoke Agent
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Transparency;
