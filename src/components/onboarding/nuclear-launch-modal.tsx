"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface NuclearLaunchModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type ModalPhase = "keys" | "countdown" | "launching";

export function NuclearLaunchModal({ open, onConfirm, onCancel }: NuclearLaunchModalProps) {
  const [keyA, setKeyA] = useState(false);
  const [keyB, setKeyB] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>("keys");
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    setKeyA(false);
    setKeyB(false);
    setPhase("keys");
    setCountdown(3);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (keyA && keyB && phase === "keys") {
      setPhase("countdown");
      setCountdown(3);
    }
  }, [keyA, keyB, phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          setPhase("launching");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "launching") {
      const timer = setTimeout(() => {
        onConfirm();
        resetState();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onConfirm, resetState]);

  function handleCancel() {
    resetState();
    onCancel();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="nuclear-launch-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-full max-w-lg px-6 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Warning header */}
            <motion.div
              className="mb-8"
              animate={phase === "countdown" ? { opacity: [1, 0.5, 1] } : undefined}
              transition={
                phase === "countdown"
                  ? { repeat: Number.POSITIVE_INFINITY, duration: 1 }
                  : undefined
              }
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500/50 bg-red-500/10">
                <span className="text-4xl text-red-500" role="img" aria-label="warning">
                  {phase === "launching" ? "!" : "\u26A0"}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {phase === "keys" && "LAUNCH AUTHORIZATION REQUIRED"}
                {phase === "countdown" && "LAUNCH SEQUENCE INITIATED"}
                {phase === "launching" && "DEPLOYING"}
              </h2>
              <p className="mt-2 text-sm text-red-400/80">
                {phase === "keys" && "Two-key confirmation required to deploy fleet"}
                {phase === "countdown" && `Deploying in ${countdown}...`}
                {phase === "launching" && "Fleet launch in progress"}
              </p>
            </motion.div>

            {/* Two-key section */}
            {phase === "keys" && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-center gap-8">
                  <KeySwitch
                    label="KEY ALPHA"
                    active={keyA}
                    onActivate={() => setKeyA(true)}
                    testId="key-alpha"
                  />
                  <KeySwitch
                    label="KEY BRAVO"
                    active={keyB}
                    onActivate={() => setKeyB(true)}
                    testId="key-bravo"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Activate both keys simultaneously to initiate launch sequence
                </p>
              </div>
            )}

            {/* Countdown display */}
            {phase === "countdown" && (
              <motion.div
                className="mb-8"
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span
                  className="text-8xl font-bold tabular-nums text-red-500"
                  data-testid="countdown-display"
                >
                  {countdown}
                </span>
              </motion.div>
            )}

            {/* Launching animation */}
            {phase === "launching" && (
              <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-red-500/20">
                  <motion.div
                    className="h-full bg-red-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Abort button */}
            {phase === "keys" && (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-white"
                onClick={handleCancel}
              >
                Abort
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KeySwitch({
  label,
  active,
  onActivate,
  testId,
}: {
  label: string;
  active: boolean;
  onActivate: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onActivate}
      disabled={active}
      className="group flex flex-col items-center gap-2"
    >
      <motion.div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors ${
          active
            ? "border-red-500 bg-red-500/20 text-red-500"
            : "border-muted-foreground/30 bg-muted/10 text-muted-foreground hover:border-red-500/50 hover:text-red-400"
        }`}
        animate={active ? { scale: [1, 1.1, 1] } : undefined}
        transition={active ? { duration: 0.3 } : undefined}
      >
        {active ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        )}
      </motion.div>
      <span
        className={`text-xs font-bold tracking-wider ${active ? "text-red-500" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <span className={`text-[10px] ${active ? "text-red-400" : "text-muted-foreground/50"}`}>
        {active ? "ARMED" : "STANDBY"}
      </span>
    </button>
  );
}
