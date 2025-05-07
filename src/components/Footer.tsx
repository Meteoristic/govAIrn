
import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <footer className="py-12 px-6 sm:px-12 md:px-16 lg:px-24 bg-charcoal border-t border-silver/10">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-indigo flex items-center justify-center">
                <span className="font-bold text-xl text-phosphor">g</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-phosphor">govAIrn</h1>
                <p className="text-silver text-sm">Democracy, powered by AI</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-8"
          >
            <a href="#" className="text-silver hover:text-gold transition-colors duration-300">Docs</a>
            <a href="#" className="text-silver hover:text-gold transition-colors duration-300">Discord</a>
            <a href="#" className="text-silver hover:text-gold transition-colors duration-300">X</a>
            <a href="#" className="text-silver hover:text-gold transition-colors duration-300">GitHub</a>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-silver text-sm"
          >
            © 2025 govAIrn. All rights reserved.
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
