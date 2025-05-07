
import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GlowingButtonProps extends ButtonProps {
  glowColor?: string;
  glowIntensity?: "subtle" | "medium" | "strong";
}

const GlowingButton = React.forwardRef<HTMLButtonElement, GlowingButtonProps>(
  ({ className, children, glowColor = "indigo", glowIntensity = "subtle", ...props }, ref) => {
    // Map intensity to specific glow settings
    const glowClasses = {
      subtle: "hover:shadow-sm hover:shadow-indigo/10",
      medium: "hover:shadow-md hover:shadow-indigo/20",
      strong: "hover:shadow-lg hover:shadow-indigo/30"
    };
    
    const glowColorMap = {
      indigo: "hover:shadow-indigo",
      cyan: "hover:shadow-cyan",
      gold: "hover:shadow-gold",
      teal: "hover:shadow-teal"
    };
    
    return (
      <Button
        ref={ref}
        className={cn(
          "transition-all duration-300", 
          glowClasses[glowIntensity],
          glowColorMap[glowColor as keyof typeof glowColorMap] || "hover:shadow-indigo",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GlowingButton.displayName = "GlowingButton";

export { GlowingButton };
