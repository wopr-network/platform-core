"use client";

import { useCallback, useEffect, useRef } from "react";

interface PortfolioChartProps {
  onMilestoneRef: React.RefObject<(() => void) | null>;
}

const BUFFER_SIZE = 800;

// Hard color phase transitions — no lerp, CRT phosphor behavior
function getLineColor(milestoneCount: number, now: number): string {
  if (milestoneCount >= 53) {
    // 2Hz pulse: white <-> terminal green
    const t = Math.sin(now * 0.004 * Math.PI) * 0.5 + 0.5;
    const r = Math.round(255 * (1 - t));
    const g = Math.round(255 * (1 - t) + 255 * t);
    const b = Math.round(255 * (1 - t) + 65 * t);
    return `rgb(${r},${g},${b})`;
  }
  if (milestoneCount >= 39) return "#FFFFFF";
  if (milestoneCount >= 26) return "#EF4444";
  if (milestoneCount >= 13) return "#F59E0B";
  return "#00FF41";
}

// Box-Muller single output
function gaussianNoise(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

interface MilestoneNode {
  t: number;
  value: number;
  born: number;
  lifetime: number;
  color: string; // birth color — retained even when line changes phase
}

export function PortfolioChart({ onMilestoneRef }: PortfolioChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    points: new Float64Array(BUFFER_SIZE * 2), // interleaved [t0, v0, t1, v1, ...]
    head: 0,
    count: 0,
    t: 0,
    value: 0,
    bias: 0.15,
    milestoneCount: 0,
    milestones: [] as MilestoneNode[],
    lastTime: 0,
    animId: 0,
  });

  const handleMilestone = useCallback(() => {
    const s = stateRef.current;
    const now = performance.now();
    const color = getLineColor(s.milestoneCount, now);

    s.milestoneCount++;
    s.bias *= 1.25;

    const lifetime = Math.max(400, 3000 - s.milestoneCount * 45);

    s.milestones.push({
      t: s.t,
      value: s.value,
      born: now,
      lifetime,
      color, // freeze birth color
    });
  }, []);

  // Wire milestone ref
  useEffect(() => {
    if (onMilestoneRef && "current" in onMilestoneRef) {
      (onMilestoneRef as React.MutableRefObject<(() => void) | null>).current = handleMilestone;
    }
    return () => {
      if (onMilestoneRef && "current" in onMilestoneRef) {
        (onMilestoneRef as React.MutableRefObject<(() => void) | null>).current = null;
      }
    };
  }, [handleMilestone, onMilestoneRef]);

  useEffect(() => {
    // Reduced motion: skip entirely
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR-aware resize
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const s = stateRef.current;
    s.lastTime = performance.now();

    const addPoint = (t: number, value: number) => {
      const idx = s.head * 2;
      s.points[idx] = t;
      s.points[idx + 1] = value;
      s.head = (s.head + 1) % BUFFER_SIZE;
      if (s.count < BUFFER_SIZE) s.count++;
    };

    const tick = (now: number) => {
      const rawDt = now - s.lastTime;
      // Cap at 3 frames to prevent jumps on tab-switch
      const dt = Math.min(rawDt, 50);
      s.lastTime = now;

      // Simulation steps (~16.67ms each)
      const steps = Math.max(1, Math.round(dt / 16.67));
      // Noise shrinks as bias grows — at high milestones the line is clearly going up
      const noiseFactor = 1.2 * Math.max(0.1, 0.92 ** s.milestoneCount);
      for (let i = 0; i < steps; i++) {
        s.t += 1;
        s.value += s.bias + gaussianNoise() * noiseFactor;
        addPoint(s.t, s.value);
      }

      // Prune dead milestones
      s.milestones = s.milestones.filter((m) => now - m.born < m.lifetime);

      // --- Draw ---
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (s.count < 2) {
        s.animId = requestAnimationFrame(tick);
        return;
      }

      // Viewport — tight at start, zooms out linearly with milestones
      const yRange = 30 + s.milestoneCount * 8;
      const yTop = s.value + yRange * 0.3;
      const yBottom = s.value - yRange * 0.7;
      const xSpan = Math.max(150, 500 - s.milestoneCount * 5);
      const xRight = s.t;
      const xLeft = s.t - xSpan;

      const toScreenX = (t: number) => ((t - xLeft) / (xRight - xLeft)) * w;
      const toScreenY = (v: number) => ((yTop - v) / (yTop - yBottom)) * h;

      // Collect visible screen points
      const screenPoints: [number, number][] = [];
      for (let i = 0; i < s.count; i++) {
        const idx = ((s.head - s.count + i + BUFFER_SIZE) % BUFFER_SIZE) * 2;
        const pt = s.points[idx];
        const pv = s.points[idx + 1];
        if (pt >= xLeft) {
          screenPoints.push([toScreenX(pt), toScreenY(pv)]);
        }
      }

      if (screenPoints.length < 2) {
        s.animId = requestAnimationFrame(tick);
        return;
      }

      const color = getLineColor(s.milestoneCount, now);

      // Base opacity for entire chart — background texture
      ctx.save();
      ctx.globalAlpha = 0.55;

      // Layer 1: Bloom (phosphor glow) — shadowBlur, not ctx.filter
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(screenPoints[0][0], screenPoints[0][1]);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i][0], screenPoints[i][1]);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();

      // Layer 2: Sharp trace on top
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(screenPoints[0][0], screenPoints[0][1]);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i][0], screenPoints[i][1]);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();

      // Milestone nodes
      for (const m of s.milestones) {
        const mx = toScreenX(m.t);
        const my = toScreenY(m.value);
        const age = (now - m.born) / m.lifetime;
        const alpha = Math.max(0, 1 - age);

        if (mx < -20 || my > h + 20 || alpha <= 0) continue;

        const outerRadius = 10 + (1 - age) * 14;

        // Halo
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, outerRadius);
        grad.addColorStop(0, m.color);
        grad.addColorStop(1, "transparent");

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Solid core
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // base opacity

      s.animId = requestAnimationFrame(tick);
    };

    s.animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(s.animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[5]" />;
}
