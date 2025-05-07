
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-lg px-6 py-3",
    "text-base font-medium text-phosphor",
    "transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-indigo hover:bg-indigo/90",
          "relative",
          "before:absolute before:inset-0 before:-z-10",
          "before:rounded-lg before:blur-md before:opacity-0",
          "before:bg-indigo before:transition-opacity before:duration-300",
          "hover:before:opacity-40",
        ],
        secondary: [
          "bg-graphite border border-silver/20",
          "hover:bg-graphite/70",
          "relative",
          "before:absolute before:inset-0 before:-z-10",
          "before:rounded-lg before:blur-md before:opacity-0",
          "before:bg-cyan/50 before:transition-opacity before:duration-300",
          "hover:before:opacity-20",
        ],
        gold: [
          "bg-gold/90 text-charcoal hover:bg-gold",
          "relative",
          "before:absolute before:inset-0 before:-z-10",
          "before:rounded-lg before:blur-md before:opacity-0",
          "before:bg-gold before:transition-opacity before:duration-300",
          "hover:before:opacity-40",
        ],
        cyan: [
          "bg-cyan/90 text-charcoal hover:bg-cyan",
          "relative",
          "before:absolute before:inset-0 before:-z-10",
          "before:rounded-lg before:blur-md before:opacity-0",
          "before:bg-cyan before:transition-opacity before:duration-300",
          "hover:before:opacity-40",
        ],
        outline: [
          "bg-transparent border border-silver/20 text-silver",
          "hover:bg-silver/10 hover:text-phosphor",
        ],
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-sm rounded-md",
        lg: "h-12 px-8 text-lg rounded-lg",
        xl: "h-14 px-10 text-lg rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }
