"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// framer-motion v12 removed the `Variants` named export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Variants = Record<string, any>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageLine =
  | { id: string; type: "user"; user: string; text: string }
  | { id: string; type: "bot"; text: string; dim?: boolean }
  | { id: string; type: "spacer" };

// ---------------------------------------------------------------------------
// Conversation data
// ---------------------------------------------------------------------------

const messages: MessageLine[] = [
  { id: "u1", type: "user", user: "tsavo", text: "!weather New York" },
  { id: "b1", type: "bot", text: "Fetching weather data...", dim: true },
  { id: "b2", type: "bot", text: "🌤  New York City: 62°F, Partly Cloudy" },
  { id: "b3", type: "bot", text: "    Wind: 8mph NE · Humidity: 54%", dim: true },
  { id: "s1", type: "spacer" },
  { id: "u2", type: "user", user: "alex", text: "summarize the last 10 messages" },
  { id: "b4", type: "bot", text: "Analyzing conversation context...", dim: true },
  { id: "b5", type: "bot", text: "Summary: Discussion about weekend plans," },
  { id: "b6", type: "bot", text: "    deployment timeline, and weather check.", dim: true },
  { id: "s2", type: "spacer" },
  { id: "u3", type: "user", user: "morgan", text: "!help" },
  { id: "b7", type: "bot", text: "Available commands: !weather, !summarize," },
  { id: "b8", type: "bot", text: "    !translate, !image + 47 more via plugins" },
];

// ---------------------------------------------------------------------------
// Animation variants
// Cubic-bezier [0.25, 0.1, 0.25, 1] is the standard easeOut equivalent
// and is always assignable to Easing (number[]) in framer-motion v12.
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ user }: { user: string }) {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm bg-zinc-700 text-[10px] font-bold uppercase text-zinc-300">
      {user[0]}
    </span>
  );
}

function BotAvatar() {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm bg-terminal/20 text-[10px] font-bold text-terminal">
      W
    </span>
  );
}

function UserLine({ user, text }: { user: string; text: string }) {
  return (
    <motion.div variants={lineVariants} className="flex items-baseline gap-2">
      <UserAvatar user={user} />
      <span className="text-xs text-zinc-400">
        <span className="font-medium text-zinc-300">@{user}</span>
        <span className="mx-1 text-zinc-600">·</span>
        <span className="text-zinc-200">{text}</span>
      </span>
    </motion.div>
  );
}

function BotLine({ text, dim }: { text: string; dim?: boolean }) {
  const isIndented = text.startsWith("    ");
  return (
    <motion.div variants={lineVariants} className="flex items-baseline gap-2">
      {isIndented ? <span className="size-5 shrink-0" aria-hidden="true" /> : <BotAvatar />}
      <span className={`text-xs ${dim ? "text-terminal/50" : "text-terminal"}`}>
        {isIndented ? (
          <span className="ml-1">{text.trimStart()}</span>
        ) : (
          <>
            <span className="mr-1 text-terminal/60">WOPR</span>
            <span className="mr-1 text-terminal/40">›</span>
            <span>{text}</span>
          </>
        )}
      </span>
    </motion.div>
  );
}

function SpacerLine() {
  return <motion.div variants={lineVariants} className="h-2" aria-hidden="true" />;
}

// CSS-only cursor blink — avoids framer-motion Easing incompatibility
// with "steps()" syntax entirely.
function BlinkingCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-[1em] w-[0.55em] animate-pulse align-text-bottom bg-terminal"
      style={{ animationDuration: "1s", animationTimingFunction: "steps(1, end)" }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// ProductPreview
// ---------------------------------------------------------------------------

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <div ref={ref} className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden rounded-sm border border-terminal/30 shadow-[0_0_40px_rgba(0,255,65,0.1)]"
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-terminal/20 bg-zinc-900 px-4 py-3">
            {/* Window dots */}
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-red-500 opacity-90" aria-hidden="true" />
              <span className="size-3 rounded-full bg-yellow-500 opacity-90" aria-hidden="true" />
              <span className="size-3 rounded-full bg-green-500 opacity-90" aria-hidden="true" />
            </div>
            {/* Title */}
            <span className="flex-1 select-none text-center font-mono text-xs tracking-wide text-zinc-500">
              wopr-bot &mdash; discord &mdash; #general
            </span>
            {/* Spacer to balance the dots */}
            <span className="w-[54px]" aria-hidden="true" />
          </div>

          {/* Terminal body */}
          <div className="crt-scanlines relative bg-zinc-950 px-5 py-5">
            <motion.div
              className="relative z-10 flex flex-col gap-2.5"
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
            >
              {messages.map((msg) => {
                if (msg.type === "spacer") {
                  return <SpacerLine key={msg.id} />;
                }
                if (msg.type === "user") {
                  return <UserLine key={msg.id} user={msg.user} text={msg.text} />;
                }
                return <BotLine key={msg.id} text={msg.text} dim={msg.dim} />;
              })}

              {/* Cursor prompt on last line */}
              <motion.div variants={lineVariants} className="flex items-baseline gap-2">
                <BotAvatar />
                <span className="text-xs text-terminal">
                  <span className="mr-1 text-terminal/60">WOPR</span>
                  <span className="mr-1 text-terminal/40">›</span>
                  <BlinkingCursor />
                </span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Caption */}
        <p className="mt-4 text-center text-xs text-muted-foreground opacity-60">
          Your bot. Your Discord server. Ready in minutes.
        </p>
      </div>
    </div>
  );
}
