
import React from 'react';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="py-24 px-6 sm:px-12 md:px-16 lg:px-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo/20 to-charcoal z-0"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
      
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan/10 rounded-full blur-3xl"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30"></div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-phosphor">
              Deploy Your <span className="text-indigo">govAIrn</span> Agent Now
            </h2>
            <p className="text-xl text-silver max-w-2xl mx-auto">
              Make every DAO vote count — without reading every word. Your AI-powered governance experience awaits.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <GradientButton 
              size="xl"
              className="flex items-center gap-2 mx-auto"
              asChild
            >
              <Link to="/auth">
                Connect Wallet
                <ArrowRight className="h-5 w-5" />
              </Link>
            </GradientButton>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan"></div>
              <span className="text-silver">Base-native</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo"></div>
              <span className="text-silver">GPT-4o Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gold"></div>
              <span className="text-silver">Gasless Voting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal"></div>
              <span className="text-silver">Revokable Anytime</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
