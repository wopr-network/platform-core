"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TERMINAL_LINES } from "./terminal-lines";

interface TerminalSequenceProps {
  onComplete?: () => void;
}

// "Shall we" persists on screen — only the suffix animates
const PREFIX = "Shall we";
const PREFIX_LENGTH = PREFIX.length; // 8

// Final held lines type at near-human speed after the blur
const FINAL_TYPE_SPEED = 65; // ms/char
const FINAL_LINE_PAUSE = 200; // ms between final lines
const FINAL_BLANK_PAUSE = 300; // ms for blank line

// Cursor death sequence
const CURSOR_SOLID_HOLD = 200; // ms solid after last char
const CURSOR_BLINK_COUNT = 3;
const CURSOR_BLINK_ON = 250; // ms
const CURSOR_BLINK_OFF = 250; // ms

function getTypeDelay(lineIndex: number): number {
  // Exponent stretched so acceleration spans the full 70-line sequence
  // Line 0: 125ms/char → Line 30: ~9ms → Line 60: ~1ms (floor)
  const factor = 1.09 ** lineIndex;
  return Math.max(1, Math.round(125 / factor));
}

function getBackspaceDelay(lineIndex: number): number {
  return Math.max(1, Math.round(getTypeDelay(lineIndex) / 2));
}

function getPauseAfter(lineIndex: number): number {
  // Line 0 gets the long beat — "Shall we play a game?" lands, then reconsiders
  if (lineIndex === 0) return 800;
  // Starts ~500ms, decays rapidly — near zero by line 20
  return Math.max(0, Math.round(600 * 0.82 ** lineIndex));
}

// Blur increases as speed increases — makes fast lines feel illegible, not chunky
function getTextBlur(lineIndex: number): number {
  return Math.min(6, Math.max(0, (lineIndex - 20) * 0.18));
}

type AnimState =
  | "idle"
  | "typing"
  | "pause"
  | "backspacing"
  | "final-typing"
  | "cursor-death"
  | "done";

export function TerminalSequence({ onComplete }: TerminalSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [animationDone, setAnimationDone] = useState(false);
  const [textBlur, setTextBlur] = useState(0);
  const bufferRef = useRef<HTMLDivElement>(null);
  // Keep onComplete in a ref so changing the prop never restarts the animation
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const stateRef = useRef<{
    state: AnimState;
    lineIndex: number;
    charIndex: number;
    startCharIndex: number; // where typing begins for the current line
    elapsed: number;
    lastTime: number;
    blinkCount: number;
    blinkPhase: "on" | "off";
  }>({
    state: "idle",
    lineIndex: 0,
    charIndex: 0,
    startCharIndex: 0,
    elapsed: 0,
    lastTime: 0,
    blinkCount: 0,
    blinkPhase: "on",
  });
  const linesRef = useRef<string[]>([]);
  const currentTextRef = useRef("");
  const rafRef = useRef<number>(0);

  const updateLines = useCallback((newLines: string[]) => {
    linesRef.current = newLines;
    setLines(newLines);
  }, []);

  const updateCurrentText = useCallback((text: string) => {
    currentTextRef.current = text;
    setCurrentText(text);
  }, []);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      const holdLines = TERMINAL_LINES.filter((l) => l.hold);
      setLines(holdLines.map((l) => l.text));
      setCurrentText("");
      setShowCursor(false);
      setAnimationDone(true);
      onCompleteRef.current?.();
      return;
    }

    const s = stateRef.current;
    s.state = "typing";
    s.lineIndex = 0;
    s.charIndex = 0;
    s.startCharIndex = 0; // Line 0 types from the very beginning
    s.elapsed = 0;
    s.lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - s.lastTime;
      s.lastTime = now;
      s.elapsed += dt;

      switch (s.state) {
        case "typing": {
          const currentLine = TERMINAL_LINES[s.lineIndex];
          if (!currentLine) {
            s.state = "done";
            break;
          }

          if (currentLine.hold) {
            // Clear the "Shall we" prefix — final block has its own lines
            updateCurrentText("");
            s.state = "final-typing";
            s.charIndex = 0;
            s.startCharIndex = 0;
            s.elapsed = 0;
            break;
          }

          const typeDelay = getTypeDelay(s.lineIndex);
          // Chars typed since this line started (offset from startCharIndex)
          const charsTyped = Math.max(0, Math.floor(s.elapsed / typeDelay));
          const newIndex = Math.min(s.startCharIndex + charsTyped, currentLine.text.length);
          if (newIndex !== s.charIndex) {
            s.charIndex = newIndex;
            updateCurrentText(currentLine.text.slice(0, newIndex));
          }
          if (s.charIndex >= currentLine.text.length) {
            s.state = "pause";
            s.elapsed = 0;
          }
          break;
        }

        case "pause": {
          const pauseDuration = getPauseAfter(s.lineIndex);
          if (s.elapsed >= pauseDuration) {
            s.state = "backspacing";
            s.elapsed = 0;
          }
          break;
        }

        case "backspacing": {
          const bsDelay = getBackspaceDelay(s.lineIndex);
          const currentLine = TERMINAL_LINES[s.lineIndex];
          // Backspace from full line length toward PREFIX_LENGTH
          // "Shall we" persists — never erased
          const charsToDelete = Math.max(1, Math.floor(s.elapsed / bsDelay));
          const newLen = Math.max(PREFIX_LENGTH, currentLine.text.length - charsToDelete);
          if (newLen !== currentTextRef.current.length) {
            updateCurrentText(currentLine.text.slice(0, newLen));
          }
          if (newLen === PREFIX_LENGTH) {
            // Commit completed line to dimmed history
            const newLines = [...linesRef.current, currentLine.text];
            updateLines(newLines);
            // "Shall we" stays in currentText — next line types its suffix onto it
            s.lineIndex++;
            s.charIndex = PREFIX_LENGTH;
            s.startCharIndex = PREFIX_LENGTH;
            s.elapsed = 0;
            s.state = "typing";
            setTextBlur(getTextBlur(s.lineIndex));
          }
          break;
        }

        case "final-typing": {
          const currentLine = TERMINAL_LINES[s.lineIndex];
          if (!currentLine) {
            s.state = "cursor-death";
            s.elapsed = 0;
            s.blinkCount = 0;
            s.blinkPhase = "on";
            break;
          }

          // Blank hold line = just a pause
          if (currentLine.text === "") {
            if (s.elapsed >= FINAL_BLANK_PAUSE) {
              const newLines = [...linesRef.current, ""];
              updateLines(newLines);
              s.lineIndex++;
              s.charIndex = 0;
              s.startCharIndex = 0;
              s.elapsed = 0;
            }
            break;
          }

          const charsToType = Math.max(1, Math.floor(s.elapsed / FINAL_TYPE_SPEED));
          if (charsToType > s.charIndex) {
            const newIndex = Math.min(charsToType, currentLine.text.length);
            s.charIndex = newIndex;
            updateCurrentText(currentLine.text.slice(0, newIndex));
          }
          if (s.charIndex >= currentLine.text.length) {
            // Commit this line and move to next
            const newLines = [...linesRef.current, currentLine.text];
            updateLines(newLines);
            updateCurrentText("");
            s.lineIndex++;
            s.charIndex = 0;
            s.startCharIndex = 0;
            s.elapsed = -FINAL_LINE_PAUSE; // negative = built-in pause before next
          }
          break;
        }

        case "cursor-death": {
          // Solid hold, then blink 3 times, then disappear
          if (s.elapsed < CURSOR_SOLID_HOLD) {
            setCursorVisible(true);
            break;
          }

          const blinkElapsed = s.elapsed - CURSOR_SOLID_HOLD;
          const cycleDuration = CURSOR_BLINK_ON + CURSOR_BLINK_OFF;
          const currentCycle = Math.floor(blinkElapsed / cycleDuration);
          const withinCycle = blinkElapsed % cycleDuration;

          if (currentCycle >= CURSOR_BLINK_COUNT) {
            setShowCursor(false);
            setAnimationDone(true);
            s.state = "done";
            onCompleteRef.current?.();
            break;
          }

          setCursorVisible(withinCycle < CURSOR_BLINK_ON);
          break;
        }

        case "done":
          return; // Stop the loop
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateCurrentText, updateLines]);

  return (
    <div
      role="img"
      aria-label="Terminal animation showing WOPR Bot capabilities accelerating from mundane tasks to cosmic scale, ending at $5/month"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black"
    >
      {/* Grid dot background */}
      <div
        className="animate-grid-drift pointer-events-none absolute inset-0 bg-[radial-gradient(#00FF4115_1px,transparent_1px)] bg-[size:24px_24px]"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Radial glow pulse */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="animate-gentle-pulse h-[600px] w-[600px] rounded-full bg-terminal/5 blur-[120px]" />
      </div>

      {/* CRT scanlines */}
      <div className="crt-scanlines pointer-events-none absolute inset-0 z-10" />

      {/* History: viewport-anchored from 5vh down to just above 50vh.
          Both history and current-line use the same viewport reference so
          neither depends on the other's rendered height. */}
      <div
        ref={bufferRef}
        className="absolute z-20 mx-auto w-full max-w-2xl overflow-hidden px-4 font-mono text-xs leading-relaxed sm:text-sm"
        style={{
          // top 5vh → bottom calc(50vh + 14px): leaves room for the current line
          top: "5vh",
          bottom: "calc(50vh + 14px)",
          left: "50%",
          transform: "translateX(-50%)",
          ...(animationDone
            ? {}
            : {
                maskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
              }),
        }}
      >
        {/* absolute bottom-0 anchors newest lines at container bottom;
            old lines overflow upward and are clipped + faded by the mask */}
        <div className="absolute bottom-0 flex w-full flex-col">
          {lines.map((line, i) => (
            <div
              key={`${i}-${line}`}
              className={animationDone ? "text-terminal" : "text-terminal/30"}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>

      {/* Current line — viewport-anchored at exactly 50vh, never moves */}
      {!animationDone && (
        <div
          className="absolute z-20 w-full max-w-2xl px-4 font-mono text-xs leading-relaxed sm:text-sm"
          style={{ top: "50vh", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <span className="text-terminal">
            <span style={textBlur > 0 ? { filter: `blur(${textBlur}px)` } : undefined}>
              {currentText}
            </span>
            {showCursor && (
              <span
                data-testid="terminal-cursor"
                className="inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-terminal"
                style={{ opacity: cursorVisible ? 1 : 0 }}
              />
            )}
          </span>
        </div>
      )}
    </div>
  );
}
