
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface RingData {
  name: string;
  value: number;
  color: string;
}

const rings: RingData[] = [
  { name: 'DAO Turnout', value: 78, color: '#505DFF' },
  { name: 'Proposal Throughput', value: 62, color: '#5FFBF1' },
  { name: 'Treasury Delta', value: 91, color: '#FFD66B' },
];

const proposals = [
  {
    id: 1,
    title: 'Protocol Parameter Updates for Q3',
    summary: 'Adjust key protocol parameters to optimize for current market conditions and improve capital efficiency.',
    pros: ['Increases capital efficiency', 'Reduces systemic risk', 'Aligns with market trends'],
    cons: ['Temporarily increases slippage', 'Requires technical adjustments', 'Short learning curve'],
    impact: 'Medium',
    impactColor: '#FFD66B',
    confidence: 86,
    aiDecision: 'For',
    aiDecisionColor: '#5FFBF1'
  },
  {
    id: 2,
    title: 'Treasury Diversification Strategy',
    summary: 'Diversify 15% of treasury assets into stablecoins and yield-bearing instruments to reduce volatility exposure.',
    pros: ['Reduces volatility', 'Creates yield stream', 'Supports operations'],
    cons: ['Lower upside potential', 'Complex implementation', 'Opportunity costs'],
    impact: 'High',
    impactColor: '#5FFBF1',
    confidence: 92,
    aiDecision: 'For',
    aiDecisionColor: '#5FFBF1'
  },
  {
    id: 3,
    title: 'Core Dev Compensation Program',
    summary: 'Establish multi-year compensation package for core developers to ensure talent retention and protocol security.',
    pros: ['Improves retention', 'Aligns incentives', 'Ensures continuity'],
    cons: ['Treasury expenditure', 'Governance oversight needed', 'Benchmarking complexity'],
    impact: 'Critical',
    impactColor: '#505DFF',
    confidence: 78,
    aiDecision: 'For',
    aiDecisionColor: '#5FFBF1'
  },
];

const DashboardPreview = () => {
  const governanceHealthRef = useRef<HTMLDivElement>(null);
  const [activeProposal, setActiveProposal] = useState(0);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  useEffect(() => {
    if (!governanceHealthRef.current) return;
    
    renderGovernanceHealth();
    
    return () => {
      if (governanceHealthRef.current) {
        governanceHealthRef.current.innerHTML = '';
      }
    };
  }, [activeMetric]);
  
  const renderGovernanceHealth = () => {
    if (!governanceHealthRef.current) return;
    
    const container = governanceHealthRef.current;
    container.innerHTML = '';
    
    const metrics = rings.map(ring => ({
      name: ring.name,
      value: ring.value,
      color: ring.color,
      description: getMetricDescription(ring.name),
      recommendation: getMetricRecommendation(ring.name, ring.value)
    }));
    
    metrics.forEach((metric, index) => {
      // Create metric card
      const metricCard = document.createElement('div');
      metricCard.className = `flex flex-col cursor-pointer transition-all duration-300 ${activeMetric === metric.name ? 'bg-gradient-to-br from-graphite/80 to-graphite/40' : 'hover:bg-graphite/30'} rounded-xl p-4`;
      metricCard.onclick = () => setActiveMetric(activeMetric === metric.name ? null : metric.name);
      
      // Create header with gauge
      const header = document.createElement('div');
      header.className = 'flex items-center gap-4 mb-3';
      
      // Create gauge
      const gauge = document.createElement('div');
      gauge.className = 'relative w-14 h-14 flex items-center justify-center';
      
      // Create gauge background
      const gaugeBg = document.createElement('svg');
      gaugeBg.setAttribute('viewBox', '0 0 36 36');
      gaugeBg.setAttribute('width', '100%');
      gaugeBg.setAttribute('height', '100%');
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', '18');
      bgCircle.setAttribute('cy', '18');
      bgCircle.setAttribute('r', '16');
      bgCircle.setAttribute('fill', 'none');
      bgCircle.setAttribute('stroke', '#2B2E3A');
      bgCircle.setAttribute('stroke-width', '3');
      
      gaugeBg.appendChild(bgCircle);
      gauge.appendChild(gaugeBg);
      
      // Create gauge foreground
      const gaugeFg = document.createElement('svg');
      gaugeFg.setAttribute('viewBox', '0 0 36 36');
      gaugeFg.setAttribute('width', '100%');
      gaugeFg.setAttribute('height', '100%');
      gaugeFg.style.position = 'absolute';
      gaugeFg.style.top = '0';
      
      const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      fgCircle.setAttribute('cx', '18');
      fgCircle.setAttribute('cy', '18');
      fgCircle.setAttribute('r', '16');
      fgCircle.setAttribute('fill', 'none');
      fgCircle.setAttribute('stroke', metric.color);
      fgCircle.setAttribute('stroke-width', '3');
      fgCircle.setAttribute('stroke-dasharray', `${metric.value} 100`);
      fgCircle.setAttribute('stroke-dashoffset', '25');
      fgCircle.setAttribute('stroke-linecap', 'round');
      fgCircle.style.transform = 'rotate(-90deg)';
      fgCircle.style.transformOrigin = '50% 50%';
      
      gaugeFg.appendChild(fgCircle);
      gauge.appendChild(gaugeFg);
      
      // Create gauge text
      const gaugeText = document.createElement('div');
      gaugeText.className = 'absolute text-sm font-medium';
      gaugeText.style.color = metric.color;
      gaugeText.textContent = `${metric.value}`;
      
      gauge.appendChild(gaugeText);
      header.appendChild(gauge);
      
      // Create metric title
      const title = document.createElement('div');
      title.className = 'flex-grow';
      
      const name = document.createElement('h4');
      name.className = 'text-base font-semibold mb-1';
      name.textContent = metric.name;
      
      const indicator = document.createElement('div');
      indicator.className = 'text-sm';
      indicator.innerHTML = getHealthIndicator(metric.value);
      
      title.appendChild(name);
      title.appendChild(indicator);
      header.appendChild(title);
      
      metricCard.appendChild(header);
      
      // Create expanded content
      if (activeMetric === metric.name) {
        const expandedContent = document.createElement('div');
        expandedContent.className = 'mt-4 text-silver/90 text-sm space-y-4';
        
        const description = document.createElement('p');
        description.textContent = metric.description;
        expandedContent.appendChild(description);
        
        const recommendation = document.createElement('div');
        recommendation.className = 'p-3 bg-black/20 border border-white/10 rounded-lg';
        recommendation.innerHTML = `<span class="font-medium text-phosphor">Recommendation:</span> ${metric.recommendation}`;
        expandedContent.appendChild(recommendation);
        
        metricCard.appendChild(expandedContent);
      }
      
      container.appendChild(metricCard);
    });
  };
  
  const getMetricDescription = (name: string): string => {
    switch (name) {
      case 'DAO Turnout':
        return 'Measures the percentage of eligible token holders participating in governance votes. Higher turnout indicates stronger community engagement and more representative decision-making.';
      case 'Proposal Throughput':
        return 'Tracks the percentage of proposals that successfully pass governance and are implemented. Higher throughput suggests an effective governance system with adequate consensus mechanisms.';
      case 'Treasury Delta':
        return 'Measures treasury growth relative to expenditures, with positive values indicating sustainable financial operations. Higher values suggest effective treasury management.';
      default:
        return '';
    }
  };
  
  const getMetricRecommendation = (name: string, value: number): string => {
    switch (name) {
      case 'DAO Turnout':
        return value >= 75 
          ? 'Current turnout is strong. Continue enhancing voter education and maintain communication channels.' 
          : 'Consider implementing delegation mechanisms and improving voter incentives to boost participation.';
      case 'Proposal Throughput':
        return value >= 60 
          ? 'Throughput is healthy. Continue refining proposal templates and maintaining clear documentation.'
          : 'Review governance processes for bottlenecks and consider simplifying voting thresholds for non-critical decisions.';
      case 'Treasury Delta':
        return value >= 80 
          ? 'Treasury growth is excellent. Consider diversifying assets to maintain sustainable long-term operations.'
          : 'Review spending policies and evaluate revenue-generating initiatives to improve treasury health.';
      default:
        return '';
    }
  };
  
  const getHealthIndicator = (value: number): string => {
    if (value >= 80) return '<span class="text-green-400">Excellent</span>';
    if (value >= 60) return '<span class="text-cyan">Good</span>';
    if (value >= 40) return '<span class="text-gold">Fair</span>';
    return '<span class="text-red-400">Needs Attention</span>';
  };
  
  return (
    <section id="dashboard" className="py-24 px-6 sm:px-12 md:px-16 lg:px-24 bg-charcoal relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
      
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6">Health Rings Dashboard</h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            Monitor key governance metrics and stay on top of active proposals.
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="flex flex-col items-center"
          >
            <div className="bg-graphite/50 border border-silver/10 rounded-2xl p-8 backdrop-blur-sm w-full h-full">
              <h3 className="text-2xl font-bold mb-6">Governance Health</h3>
              <div className="space-y-3" ref={governanceHealthRef}>
                {/* Governance health metrics will be rendered here */}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-silver/70 mb-4">
                  The Governance Health module provides real-time metrics to help DAOs identify strengths and areas for improvement in their governance systems.
                </p>
                <Button variant="outline" className="w-full border-white/20 bg-black/20 text-white hover:bg-white/10 hover:text-white">
                  View Detailed Analytics
                </Button>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex flex-col"
          >
            <div className="bg-graphite/50 border border-silver/10 rounded-2xl p-8 backdrop-blur-sm h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">AI Proposal Summary</h3>
                <div className="flex gap-2">
                  {proposals.map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-2 h-2 rounded-full cursor-pointer ${
                        i === activeProposal ? 'bg-indigo' : 'bg-silver/30'
                      }`}
                      onClick={() => setActiveProposal(i)}
                      whileHover={{ scale: 1.5 }}
                    ></motion.div>
                  ))}
                </div>
              </div>
              
              {/* Proposal display */}
              <motion.div
                key={activeProposal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-grow flex flex-col"
              >
                <h4 className="text-xl font-medium mb-3">{proposals[activeProposal].title}</h4>
                <p className="text-silver mb-4">{proposals[activeProposal].summary}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h5 className="text-sm text-cyan mb-2">Pros</h5>
                    <ul className="space-y-1">
                      {proposals[activeProposal].pros.map((pro, i) => (
                        <li key={i} className="text-sm text-silver flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan inline-block"></span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm text-silver mb-2">Cons</h5>
                    <ul className="space-y-1">
                      {proposals[activeProposal].cons.map((con, i) => (
                        <li key={i} className="text-sm text-silver flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-silver inline-block"></span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Impact:</span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium" 
                      style={{ 
                        backgroundColor: `${proposals[activeProposal].impactColor}30`,
                        color: proposals[activeProposal].impactColor 
                      }}
                    >
                      {proposals[activeProposal].impact}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Confidence:</span>
                    <span className="text-cyan font-medium">{proposals[activeProposal].confidence}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-green-400/30 bg-green-400/10 rounded-lg mb-6 mt-auto">
                  <span className="text-sm font-medium">AI Decision:</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium" 
                    style={{ 
                      backgroundColor: `${proposals[activeProposal].aiDecisionColor}30`,
                      color: proposals[activeProposal].aiDecisionColor 
                    }}
                  >
                    {proposals[activeProposal].aiDecision}
                  </span>
                </div>
                
                <Button className="w-full bg-indigo hover:bg-indigo/90 text-phosphor transition-all duration-300 mt-auto">
                  Let Agent Decide
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
