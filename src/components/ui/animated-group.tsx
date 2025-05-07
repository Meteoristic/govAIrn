
import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedGroupProps {
  children: React.ReactNode;
  variants?: any;
  className?: string;
  delay?: number;
}

export const AnimatedGroup = ({ children, variants, className, delay = 0 }: AnimatedGroupProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants || {
        container: {
          visible: {
            transition: {
              staggerChildren: 0.1,
              delayChildren: delay,
            },
          },
        },
        item: {
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1, 
            y: 0,
            transition: {
              type: 'spring',
              bounce: 0.3,
              duration: 1.5,
            },
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <motion.div key={index} variants={variants ? variants.item : undefined}>
              {child}
            </motion.div>
          );
        }
        return child;
      })}
    </motion.div>
  );
};
