
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const menuItems = [
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Features', href: '#features' },
  { name: 'Persona Builder', href: '#persona' },
  { name: 'Dashboard', href: '#dashboard' },
  { name: 'FAQ', href: '#faq' },
];

const Navbar = () => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Optimize scroll listener with throttling
  useEffect(() => {
    const handleScroll = () => {
      // Only update state if the condition changes
      const shouldBeScrolled = window.scrollY > 50;
      if (isScrolled !== shouldBeScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };
    
    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);
  
  return (
    <header className="fixed z-20 w-full">
      <nav className={cn(
        "transition-all duration-300 ease-out",
        menuState ? "backdrop-blur-lg" : ""
      )}>
        <div className={cn(
          'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', 
          isScrolled && 'bg-charcoal/50 max-w-4xl rounded-2xl border border-silver/10 backdrop-blur-lg lg:px-5'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center gap-2"
              >
                <div className="h-8 w-8 rounded-full bg-indigo flex items-center justify-center">
                  <span className="font-bold text-xl text-phosphor">g</span>
                </div>
                <h1 className="text-xl font-bold text-phosphor">govAIrn</h1>
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className={cn(
                  "m-auto size-6 duration-200",
                  menuState && "rotate-180 scale-0 opacity-0"
                )} />
                <X className={cn(
                  "absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200",
                  menuState && "rotate-0 scale-100 opacity-100"
                )} />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="text-silver hover:text-phosphor block duration-150"
                    >
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              "bg-charcoal mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-silver/10 p-6 shadow-2xl lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none",
              menuState && "block"
            )}>
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="text-silver hover:text-phosphor block duration-150"
                        onClick={() => setMenuState(false)}
                      >
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <GradientButton 
                  size="default"
                  className={cn(
                    isScrolled ? "lg:inline-flex" : ""
                  )}
                  asChild
                >
                  <Link to="/dashboard">
                    Launch Agent
                  </Link>
                </GradientButton>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
