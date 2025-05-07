import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { CanvasRevealEffect } from '@/components/ui/canvas-reveal-effect';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5
      }
    }
  }
};
const HeroSection = () => {
  const [showVideo, setShowVideo] = useState(false);
  return <section className="relative min-h-screen pt-32 pb-20 px-6 sm:px-12 md:px-16 lg:px-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 w-full h-full -z-10">
        {/* Gradient background similar to CTA section */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo/20 to-charcoal"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-silver/20 to-transparent"></div>
        
        {/* Decorative elements from CTA section */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan/10 rounded-full blur-3xl"></div>
        
        {/* Original ellipsis background */}
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-indigo/10 rounded-full filter blur-[80px] opacity-50" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-cyan/10 rounded-full filter blur-[80px] opacity-60" />
      </div>
      
      <div aria-hidden className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
        <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(240,100%,70%,.08)_0,hsla(240,100%,60%,.02)_50%,hsla(240,100%,55%,0)_80%)]" />
        <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(240,100%,70%,.06)_0,hsla(240,100%,55%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
      </div>
      
      {/* Grid pattern from CTA section */}
      <div className="absolute inset-0 grid-pattern opacity-30"></div>
      
      <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
      
      {/* Moving dots background */}
      <CanvasRevealEffect containerClassName="opacity-20" dotColor="255, 255, 255" dotCount={70} dotSize={2} colors={[[80, 93, 255],
    // indigo
    [95, 251, 241],
    // cyan
    [255, 214, 107] // gold
    ]} animationSpeed={2} />
      
      <div className="container mx-auto grid lg:grid-cols-2 gap-12 relative z-10">
        {/* Left column - Text content */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.7
      }} className="flex flex-col justify-center max-w-xl mx-auto lg:mx-0">
          <AnimatedGroup variants={transitionVariants}>
            <div className="flex items-center gap-2 rounded-full border border-silver/20 bg-graphite/50 p-1.5 px-4 w-fit mb-8">
              <span className="text-cyan text-base font-medium inline-block animate-pulse-glow">The AI Governance Layer</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-8 tracking-tight">
              <span className="text-phosphor">Delegate Smarter.</span> <br />
              <span className="bg-gradient-to-r from-indigo to-cyan bg-clip-text text-transparent">Let AI Vote With You,</span> <br />
              <span className="text-phosphor">Not For You.</span>
            </h1>
            
            <p className="text-xl text-silver mb-10 leading-relaxed max-w-lg">
              Summarized proposals. Personalized policy. Gasless votes via AgentKit. AI-enhanced DAO governance that respects your values.
            </p>
          </AnimatedGroup>
          
          <AnimatedGroup variants={{
          container: {
            visible: {
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.75
              }
            }
          },
          ...transitionVariants
        }} className="flex flex-wrap gap-4">
            <GradientButton className="flex items-center gap-2 px-8 py-5 text-lg" asChild>
              <Link to="/dashboard">
                Launch Agent
                <ArrowRight className="h-5 w-5 ml-1" />
              </Link>
            </GradientButton>
            
            <Button variant="outline" onClick={() => setShowVideo(true)} className="border-silver/30 hover:bg-silver/10 text-lg py-6 px-8 rounded-lg flex items-center gap-2 text-zinc-300">
              <div className="size-6 rounded-full bg-indigo/80 flex items-center justify-center mr-1">
                <Play className="h-3 w-3 text-white" />
              </div>
              Watch Demo
            </Button>
          </AnimatedGroup>
        </motion.div>

        {/* Right column - Visual content */}
        <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.7,
        delay: 0.3
      }} className="relative flex items-center justify-center">
          <CardSpotlight className="relative w-full h-[500px] rounded-2xl border border-silver/10 p-4 overflow-hidden">
            {/* Floating elements */}
            <motion.div initial={{
            y: 0
          }} animate={{
            y: [0, -15, 0],
            rotate: [0, 2, 0]
          }} transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }} className="absolute top-1/4 right-1/4 w-20 h-20 bg-gradient-to-br from-indigo/20 to-cyan/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-indigo/30">
              <motion.div animate={{
              rotate: 360
            }} transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }} className="w-10 h-10 bg-indigo rounded-md flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-phosphor" />
              </motion.div>
            </motion.div>
            
            <motion.div initial={{
            y: 0
          }} animate={{
            y: [0, 15, 0],
            rotate: [0, -2, 0]
          }} transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }} className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-cyan/20 to-indigo/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-cyan/30">
              <motion.div animate={{
              rotate: -360
            }} transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }} className="w-12 h-12 bg-cyan rounded-md flex items-center justify-center">
                <img src="/placeholder.svg" alt="Vote icon" className="h-6 w-6 object-contain opacity-90" />
              </motion.div>
            </motion.div>
            
            {/* Center hub */}
            <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div animate={{
              scale: [1, 1.05, 1],
              filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
            }} transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }} className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo via-cyan to-indigo opacity-70 blur-sm" />
                <div className="w-32 h-32 bg-gradient-to-br from-indigo to-cyan rounded-full flex items-center justify-center shadow-xl">
                  <img src="/placeholder.svg" alt="govAIrn Logo" className="w-16 h-16 object-contain" onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23505DFF' /%3E%3Ctext x='50' y='60' font-family='Arial' font-size='30' fill='white' text-anchor='middle'%3Eg%3C/text%3E%3C/svg%3E";
                }} />
                </div>
              </motion.div>
              
              {/* Orbiting paths */}
              <motion.div animate={{
              rotate: 360
            }} transition={{
              duration: 60,
              repeat: Infinity,
              ease: "linear"
            }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-indigo/20" />
              
              <motion.div animate={{
              rotate: -360
            }} transition={{
              duration: 80,
              repeat: Infinity,
              ease: "linear"
            }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-cyan/20" />
              
              <motion.div animate={{
              rotate: 360
            }} transition={{
              duration: 100,
              repeat: Infinity,
              ease: "linear"
            }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-gold/20" />
            </motion.div>
          </CardSpotlight>
        </motion.div>
      </div>
      
      {/* Video modal */}
      <AnimatePresence>
        {showVideo && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{
          scale: 0.9,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.9,
          opacity: 0
        }} className="bg-graphite rounded-xl overflow-hidden w-full max-w-4xl aspect-video relative">
              <div className="absolute top-4 right-4">
                <Button variant="outline" size="icon" onClick={() => setShowVideo(false)} className="rounded-full bg-charcoal/50 border-silver/10 hover:bg-charcoal/70">
                  <ArrowRight className="h-5 w-5 rotate-45" />
                </Button>
              </div>
              <div className="w-full h-full flex items-center justify-center">
                {/* Placeholder for video content */}
                <div className="flex flex-col items-center text-silver">
                  <Play className="h-16 w-16 text-indigo mb-4" />
                  <p>Demo video would play here</p>
                </div>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </section>;
};
export default HeroSection;