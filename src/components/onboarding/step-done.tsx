"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface StepDoneProps {
  onGoToDashboard: () => void;
  onCreateAnother: () => void;
}

const PARTICLE_COUNT = 24;

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i,
    distance: 60 + Math.random() * 80,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 0.3,
    duration: 0.6 + Math.random() * 0.4,
  }));
}

export function StepDone({ onGoToDashboard, onCreateAnother }: StepDoneProps) {
  const [particles] = useState(generateParticles);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 text-center">
      {/* Particle burst + icon */}
      <div className="relative mx-auto h-40 w-40">
        {/* Particles */}
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = Math.cos(rad) * p.distance;
          const y = Math.sin(rad) * p.distance;
          return (
            <motion.div
              key={p.id}
              className="absolute left-1/2 top-1/2 rounded-full bg-terminal"
              style={{
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x, y, opacity: 0, scale: 0.2 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
            />
          );
        })}

        {/* Central icon */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-terminal bg-terminal/10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring", bounce: 0.4 }}
        >
          <motion.svg
            className="h-10 w-10 text-terminal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
            aria-label="Deployment complete"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        </motion.div>

        {/* Glow ring */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-terminal/30"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>

      {/* Fleet active status */}
      <AnimatedContent visible={showContent}>
        <div>
          <motion.div
            className="mb-2 inline-block rounded-sm border border-terminal/30 bg-terminal/10 px-3 py-1 text-xs font-bold tracking-widest text-terminal"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            FLEET ACTIVE
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight">Your WOPR is live!</h2>
          <p className="mt-2 text-muted-foreground">
            Fleet deployed and operational. All systems nominal.
          </p>

          {/* Fleet stats */}
          <div className="mx-auto mt-4 flex max-w-xs justify-center gap-6 text-center">
            <FleetStat label="Containers" value="3" delay={1.0} />
            <FleetStat label="Uptime" value="100%" delay={1.1} />
            <FleetStat label="Status" value="OK" delay={1.2} />
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent visible={showContent}>
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" variant="terminal" onClick={onGoToDashboard}>
            Go to Dashboard
          </Button>
          <Button variant="ghost" onClick={onCreateAnother}>
            Create another WOPR
          </Button>
        </div>
      </AnimatedContent>
    </div>
  );
}

function AnimatedContent({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

function FleetStat({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="text-lg font-bold text-terminal">{value}</div>
      <div className="text-[10px] tracking-wider text-muted-foreground">{label}</div>
    </motion.div>
  );
}
