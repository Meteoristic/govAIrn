
"use client";
import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface CardStackProps {
  cards: {
    id: string;
    title: string;
    content: React.ReactNode;
  }[];
  stackedView?: boolean;
}

export const CardsStack = ({
  cards,
  stackedView = false,
}: CardStackProps) => {
  const [activeCard, setActiveCard] = useState(0);

  const moveToNextCard = () => {
    setActiveCard((prev) => (prev === cards.length - 1 ? 0 : prev + 1));
  };

  const moveToPrevCard = () => {
    setActiveCard((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
  };

  // Auto advance every 4 seconds
  useEffect(() => {
    if (!stackedView) return;
    const interval = setInterval(moveToNextCard, 4000);
    return () => clearInterval(interval);
  }, [stackedView, cards.length]);

  if (!stackedView) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-graphite border border-silver/10 rounded-xl p-6 hover:border-silver/20 transition"
          >
            <h3 className="text-xl font-medium mb-3">{card.title}</h3>
            <div className="text-silver">{card.content}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-80 w-full overflow-visible">
      {cards.map((card, index) => {
        // Calculate whether card is active, next, previous, or inactive
        const isActive = index === activeCard;
        const isNext =
          index === (activeCard + 1) % cards.length;
        const isPrev =
          index === (activeCard - 1 + cards.length) % cards.length;
        const isInactive = !isActive && !isNext && !isPrev;

        return (
          <motion.div
            key={card.id}
            className="absolute inset-0 bg-graphite border border-silver/10 rounded-xl p-6 shadow-lg overflow-hidden"
            initial={false}
            animate={{
              scale: isActive ? 1 : isInactive ? 0.85 : 0.95,
              opacity: isActive ? 1 : isInactive ? 0.3 : 0.7,
              x: isActive ? 0 : isNext ? 40 : isPrev ? -40 : 0,
              y: isActive ? 0 : isNext ? 20 : isPrev ? 20 : 0,
              zIndex: isActive ? 30 : isNext ? 20 : isPrev ? 20 : 10,
              rotateY: isActive ? 0 : isNext ? 10 : isPrev ? -10 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <div className="h-full flex flex-col">
              <h3 className="text-xl font-medium mb-3">{card.title}</h3>
              <div className="text-silver flex-grow">{card.content}</div>
              <div className="pt-4 flex justify-between items-center text-xs text-silver/50">
                <span>
                  {activeCard + 1} of {cards.length}
                </span>
                <div className="flex gap-2">
                  <button onClick={moveToPrevCard} className="p-1 hover:text-phosphor">
                    ←
                  </button>
                  <button onClick={moveToNextCard} className="p-1 hover:text-phosphor">
                    →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
