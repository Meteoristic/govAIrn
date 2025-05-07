
"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type CanvasProps = {
  containerClassName?: string;
  dotSize?: number;
  dotColor?: string;
  dotCount?: number;
  colors?: number[][];
  animationSpeed?: number;
};

export const CanvasRevealEffect = ({
  containerClassName,
  dotSize = 3,
  dotColor = "255, 255, 255",
  dotCount = 100,
  colors = [[255, 255, 255]], // Default is white
  animationSpeed = 3,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: number[];
      size: number;
    }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize dots
    for (let i = 0; i < dotCount; i++) {
      const randomColorIndex = Math.floor(Math.random() * colors.length);
      const dot = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * animationSpeed * 0.1,
        vy: (Math.random() - 0.5) * animationSpeed * 0.1,
        color: colors[randomColorIndex],
        size: dotSize * (0.5 + Math.random() * 0.5), // Variable size
      };
      dotsRef.current.push(dot);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dotsRef.current.forEach((dot) => {
        // Update position
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Bounce off edges
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dot.color[0]}, ${dot.color[1]}, ${dot.color[2]}, 0.7)`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
      dotsRef.current = [];
    };
  }, [dotSize, dotColor, dotCount, colors, animationSpeed]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", containerClassName)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
