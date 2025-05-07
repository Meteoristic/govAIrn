
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from 'framer-motion';

const faqs = [
  {
    question: "What is govAIrn?",
    answer: "govAIrn is an AI-powered DAO governance platform that helps you delegate your voting power while maintaining control. Our system summarizes proposals, applies your personal policy preferences, and executes gasless votes via AgentKit, enhancing DAO governance while respecting your values."
  },
  {
    question: "How does the Decision Agent work?",
    answer: "The Decision Agent is an AI-powered assistant that learns your governance preferences through a series of questions and policy statements. It then analyzes proposals, applies your established policy guidelines, and recommends votes that align with your preferences. You always maintain final approval before any vote is cast."
  },
  {
    question: "Is my data and voting history secure?",
    answer: "Yes, we prioritize security and privacy. All your policy preferences and voting history are encrypted and stored securely. You control who can access your governance data, and the system is built with multiple layers of security to protect your information."
  },
  {
    question: "Can I customize my governance preferences?",
    answer: "Absolutely! Our Persona Builder allows you to create detailed policy profiles by answering questions about your governance philosophy, risk tolerance, and priorities for different types of proposals. You can have multiple personas for different DAOs or governance contexts."
  },
  {
    question: "How does govAIrn improve DAO participation?",
    answer: "govAIrn addresses key barriers to participation: information overload, technical complexity, and gas costs. By summarizing proposals, providing analysis aligned with your values, and enabling gasless voting, we make governance accessible to more participants, improving overall DAO health and decision quality."
  },
  {
    question: "Is govAIrn compatible with my DAO?",
    answer: "govAIrn works with most major DAO frameworks including Compound Governor, OpenZeppelin Governor, DAOstack, Aragon, and custom governance systems. Our platform is designed to be flexible and can integrate with various on-chain governance mechanisms."
  }
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 grid-pattern opacity-30" />
      
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl font-semibold mb-3 bg-gradient-to-r from-phosphor via-indigo to-phosphor bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-silver">
            Everything you need to know about govAIrn and how it can transform your DAO governance experience.
          </p>
        </motion.div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <AccordionItem 
                  value={`item-${index}`}
                  className="rounded-lg border border-silver/20 overflow-hidden bg-transparent hover:bg-graphite/10"
                >
                  <AccordionTrigger className="px-6 py-4 text-left text-silver hover:text-phosphor hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-sm text-silver leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
