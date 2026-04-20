"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const nextParticles: Particle[] = Array.from({ length: 25 }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.2
    }));

    setParticles(nextParticles);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="animate-float absolute rounded-full bg-white"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}

      <div className="animate-pulse-slow absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="animate-pulse-slower absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />

      <div className="animate-twinkle absolute right-1/3 top-1/5 h-2 w-2 rounded-full bg-white" style={{ animationDelay: "0s" }} />
      <div className="animate-twinkle absolute left-1/4 top-2/3 h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: "1s" }} />
      <div className="animate-twinkle absolute bottom-1/4 right-1/2 h-2 w-2 rounded-full bg-white" style={{ animationDelay: "2s" }} />
      <div className="animate-twinkle absolute left-1/3 top-1/2 h-1 w-1 rounded-full bg-white" style={{ animationDelay: "0.5s" }} />
      <div className="animate-twinkle absolute right-1/4 top-3/4 h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: "1.5s" }} />
    </div>
  );
}
