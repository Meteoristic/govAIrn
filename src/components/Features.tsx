
import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Rocket, Shield } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Proposals Decoded Instantly',
    description: '120-word summary, pros/cons, and impact score — powered by GPT-4o.',
    color: 'bg-indigo',
    delay: 0
  },
  {
    icon: Rocket,
    title: 'Gasless, Effortless Voting',
    description: 'AgentKit casts your vote with USDC gas sponsorship. One tap.',
    color: 'bg-cyan',
    delay: 0.2
  },
  {
    icon: Shield,
    title: 'Stay Sovereign, Stay Delegated',
    description: 'Your vote weight stays yours. AI only acts with your approval.',
    color: 'bg-gold',
    delay: 0.4
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 px-6 sm:px-12 md:px-16 lg:px-24 bg-charcoal relative">
      <div className="absolute inset-0 grid-pattern opacity-30"></div>
      
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6">Built for Voters Who Value Time, Precision, and Control</h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            Participate in DAO governance on your terms, with AI-powered insights and efficient execution.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: feature.delay }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-gradient-to-br from-graphite to-graphite/50 border border-silver/10 rounded-2xl p-8 hover:border-silver/20 transition-all duration-300 group"
            >
              <div className="mb-6">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center text-phosphor transition-all duration-300 group-hover:scale-110`}>
                  <feature.icon size={32} />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-silver">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
