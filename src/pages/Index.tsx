
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import HowItWorks from '@/components/HowItWorks';
import Features from '@/components/Features';
import PersonaBuilder from '@/components/PersonaBuilder';
import DashboardPreview from '@/components/DashboardPreview';
import Transparency from '@/components/Transparency';
import FAQSection from '@/components/FAQSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import { PersonaValues } from '@/types/persona';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [demoPersona, setDemoPersona] = useState<PersonaValues>({
    risk: 50,
    esg: 30,
    treasury: 60,
    horizon: 50,
    frequency: 40
  });

  const handleDemoPersonaUpdate = (values: PersonaValues) => {
    setDemoPersona(values);
    toast({
      title: 'Demo Preferences',
      description: 'Your preferences have been saved. Create an account to use them in real governance.',
    });
  };

  return (
    <div className="min-h-screen bg-charcoal text-phosphor font-inter">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <Features />
        <PersonaBuilder 
          initialValues={demoPersona} 
          onUpdate={handleDemoPersonaUpdate}
          isLoading={false}
          showSaveButton={false}
        />
        <DashboardPreview />
        <Transparency />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
