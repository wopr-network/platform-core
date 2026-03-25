/**
 * Mine real Claude Code sessions into labeled training data.
 *
 * For each session JSONL:
 * 1. Walk line by line, building the conversation
 * 2. Every time a real user message appears = one training sample
 * 3. The sample is EVERYTHING from the start to that point
 * 4. Send the full conversation to Haiku for a complexity score
 * 5. Write { conversation: <raw lines>, score: 0.0-1.0 } to output
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx mine-and-label.ts
 *    or: npx tsx mine-and-label.ts  (SDK picks up auth automatically)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createReadStream, appendFileSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

// Load OAuth token fresh each time (token may refresh during long runs)
function getClient(): Anthropic {
  const creds = JSON.parse(readFileSync(join(process.env.HOME!, ".claude", ".credentials.json"), "utf8"));
  return new Anthropic({ apiKey: creds.claudeAiOauth.accessToken });
}
let client = getClient();
let lastTokenRefresh = Date.now();

function refreshClientIfNeeded(): void {
  // Re-read token every 5 minutes
  if (Date.now() - lastTokenRefresh > 5 * 60 * 1000) {
    client = getClient();
    lastTokenRefresh = Date.now();
    console.log("  (refreshed auth token)");
  }
}
const OUTPUT = "dataset-sessions.jsonl";
const SESSIONS_DIR = join(process.env.HOME!, ".claude", "projects");
const MAX_SESSIONS = 5;
const MAX_CHARS_TO_HAIKU = 8000; // Truncate what we send to Haiku for scoring, but keep full data

interface RawLine {
  type: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };
}

function extractText(content: string | Array<{ type: string; text?: string }> | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("\n");
}

function isRealUserMessage(text: string): boolean {
  // Strip system noise
  const stripped = text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<task-notification>[\s\S]*?<\/task-notification>/g, "")
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "")
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, "")
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, "")
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "")
    .trim();
  return stripped.length > 10;
}

function summarizeLines(lines: string[], maxChars: number, labelAssistantTools = false): string {
  const parts: string[] = [];
  let totalChars = 0;

  for (const line of lines) {
    if (totalChars > maxChars) break;
    try {
      const obj: RawLine = JSON.parse(line);
      if (obj.type === "user" && obj.message?.role === "user") {
        const text = extractText(obj.message.content);
        if (text) {
          const clean = text.substring(0, 500);
          parts.push(`USER: ${clean}`);
          totalChars += clean.length;
        }
      } else if (obj.type === "assistant" && obj.message?.role === "assistant") {
        const content = obj.message.content;
        if (labelAssistantTools && Array.isArray(content)) {
          // Count tool uses for the output section
          const toolUses = content.filter((b: any) => b.type === "tool_use");
          const text = extractText(content);
          const clean = text.substring(0, 300);
          if (toolUses.length > 0) {
            parts.push(`ASSISTANT: [${toolUses.length} tool calls: ${toolUses.map((t: any) => t.name || "unknown").join(", ")}] ${clean}`);
          } else if (clean) {
            parts.push(`ASSISTANT: ${clean}`);
          }
          totalChars += clean.length + (toolUses.length * 20);
        } else {
          const text = extractText(content);
          if (text) {
            const clean = text.substring(0, 300);
            parts.push(`ASSISTANT: ${clean}`);
            totalChars += clean.length;
          }
        }
      }
    } catch {}
  }

  return parts.join("\n\n");
}

async function scoreWithClaude(inputSummary: string, outputSummary: string): Promise<number | null> {
  refreshClientIfNeeded();
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: `You are a CLASSIFIER that reviews completed AI coding assistant work and scores its complexity from 0.0 to 1.0. You receive the INPUT (conversation context) and the OUTPUT (what the assistant actually did). Score the OUTPUT's complexity. Reply with 1-2 sentences of reasoning then SCORE: and a number.`,
      messages: [
        {
          role: "user",
          content: `## INPUT — The conversation state when the user spoke:

${inputSummary}

## OUTPUT — What the assistant ACTUALLY DID in response:

${outputSummary}

## HOW TO JUDGE COMPLEXITY

You are reviewing COMPLETED work. You can see exactly what the assistant did. Score it 0.0 to 1.0 based on the following principles.

REASONING MATTERS AS MUCH AS ACTIONS. An assistant that writes a thoughtful 500-word analysis of an architecture problem, makes design recommendations, and weighs tradeoffs has done complex work — even with zero tool calls. Brainstorming, planning, and design thinking are high-complexity tasks. A long, thoughtful text response analyzing a problem is NOT 0.1 — it's 0.4-0.7 depending on depth.

TEXT-ONLY RESPONSES CAN BE COMPLEX. If the assistant wrote a detailed explanation, proposed an architecture, compared approaches, or analyzed tradeoffs, that is real intellectual work. Score it based on the depth of reasoning, not the absence of tool calls. "Just text" does not mean "simple." Only score text responses low (0.0-0.2) if they are genuinely trivial — a one-liner, a yes/no, a quick clarification.

TOOL CALLS INDICATE EXECUTION COMPLEXITY. When the assistant used tools — reading files, writing code, running commands, making edits — the number and nature of tool calls indicates execution complexity. Reading 1 file = low. Reading 10 files and making coordinated edits = high. Spawning subagents = very high.

CODE WRITING IS INHERENTLY COMPLEX. Writing new code (not just a one-liner) requires understanding the codebase, making design decisions, handling edge cases, and ensuring correctness. Any response that writes a function, module, or test is at least 0.4. Writing across multiple files is 0.6+. Creating new packages or repos is 0.8+.

DEBUGGING IS ALWAYS COMPLEX. If the assistant investigated a bug — reading files to understand the problem, forming hypotheses, testing them, finding the root cause, and fixing it — that's 0.5 minimum, regardless of how small the final fix was. The complexity is in the investigation, not the patch.

SCOPE AMPLIFIES EVERYTHING. Single-file work caps around 0.5. Multi-file work in one repo: 0.5-0.7. Cross-repo changes: 0.7-0.9. Multi-repo with deployment: 0.9-1.0.

WHAT 0.0 ACTUALLY LOOKS LIKE: "You're welcome!" / "Got it." / "Sure, I'll do that." — a 1-2 sentence acknowledgment with no substance.

WHAT 0.5 LOOKS LIKE: Read 3-4 files, made a focused fix, ran tests to verify. Or: wrote a detailed technical analysis with specific recommendations.

WHAT 1.0 LOOKS LIKE: Created a new repo, wrote dozens of files, set up CI/CD, deployed to production, updated consumers across multiple repos.

USE THE FULL RANGE. Don't cluster. If the output shows real work — reasoning OR execution — score it accordingly.

Write 1-2 sentences about what the assistant actually did, then SCORE: and the number.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    // Look for SCORE: X.X pattern first, then any number
    const scoreMatch = text.match(/SCORE:\s*(0\.\d+|1\.0|0|1)/i);
    const match = scoreMatch || text.match(/\b(0\.\d+|1\.0|0|1)\b/);
    if (!match) {
      console.error(`  Bad response: "${text.substring(0, 100)}"`);
      return null;
    }
    const score = parseFloat(match[1]);
    if (isNaN(score) || score < 0 || score > 1) return null;
    return Math.round(score * 20) / 20;
  } catch (err) {
    console.error(`  Haiku error: ${(err as Error).message?.substring(0, 80)}`);
    return null;
  }
}

function findSessions(dir: string, results: string[] = [], depth = 0): string[] {
  if (depth > 3 || results.length >= 100) return results;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "subagents") {
        findSessions(join(dir, entry.name), results, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        const full = join(dir, entry.name);
        const stat = statSync(full);
        if (stat.size > 100_000) {
          // Only sessions > 100KB (meaningful conversations)
          results.push(full);
        }
      }
    }
  } catch {}
  return results;
}

async function processSession(sessionPath: string): Promise<number> {
  console.log(`\nProcessing: ${sessionPath}`);

  const rl = createInterface({
    input: createReadStream(sessionPath),
    crlfDelay: Infinity,
  });

  const allLines: string[] = [];
  const cutPoints: number[] = []; // Line indices where real user messages appear
  const resetPoints: number[] = [0]; // Line indices where conversation resets (compaction summaries)

  let lineIdx = 0;
  for await (const line of rl) {
    allLines.push(line);
    try {
      const obj: RawLine = JSON.parse(line);
      if (obj.type === "user" && obj.message?.role === "user") {
        const text = extractText(obj.message.content);
        if (text.includes("This session is being continued from a previous conversation")) {
          resetPoints.push(lineIdx);
        }
        if (isRealUserMessage(text)) {
          cutPoints.push(lineIdx);
        }
      }
    } catch {}
    lineIdx++;
  }

  console.log(`  ${allLines.length} lines, ${cutPoints.length} real user turns, ${resetPoints.length} segments`);

  let samplesWritten = 0;
  for (let i = 0; i < cutPoints.length; i++) {
    const cutLine = cutPoints[i];

    // Skip last turn — no output to evaluate
    if (i === cutPoints.length - 1) continue;

    // Find the most recent reset point before this cut
    let segmentStart = 0;
    for (const rp of resetPoints) {
      if (rp <= cutLine) segmentStart = rp;
      else break;
    }

    // X = INPUT: conversation from segment start up to and including this user message
    const inputLines = allLines.slice(segmentStart, cutLine + 1);

    // Z = OUTPUT: everything from after this user message to the next user message
    const nextCut = cutPoints[i + 1];
    const outputLines = allLines.slice(cutLine + 1, nextCut);

    // Summarize both
    const inputSummary = summarizeLines(inputLines, MAX_CHARS_TO_HAIKU);
    const outputSummary = summarizeLines(outputLines, MAX_CHARS_TO_HAIKU, true);

    if (inputSummary.length < 20 || outputSummary.length < 10) continue;

    // Haiku sees X and Z, produces Y
    const score = await scoreWithClaude(inputSummary, outputSummary);
    if (score === null) continue;

    // Training data is X (input messages) and Y (score). Z is NOT included.
    const messages: Array<{ role: string; content: string }> = [];
    for (const wline of inputLines) {
      try {
        const obj: RawLine = JSON.parse(wline);
        if (obj.type === "user" && obj.message?.role === "user") {
          const text = extractText(obj.message.content);
          if (text) messages.push({ role: "user", content: text });
        } else if (obj.type === "assistant" && obj.message?.role === "assistant") {
          const text = extractText(obj.message.content);
          if (text) messages.push({ role: "assistant", content: text });
        }
      } catch {}
    }

    const sample = { messages, score, turns: messages.length, source: sessionPath.split("/").slice(-2).join("/") };
    const outFile = (globalThis as any).__OUTPUT || OUTPUT;
    appendFileSync(outFile, JSON.stringify(sample) + "\n");
    samplesWritten++;

    // Log EVERY sample
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content?.substring(0, 80) || "";
    console.log(`  [${samplesWritten}] turn ${i + 1}/${cutPoints.length} → ${score.toFixed(2)} | ${messages.length} msgs | "${lastUser}..."`);
  }

  console.log(`  Wrote ${samplesWritten} samples`);
  return samplesWritten;
}

async function main() {
  // If a session path is passed as argument, process just that one
  const sessionArg = process.argv[2];

  if (sessionArg) {
    // Single session mode — output to session-specific file
    const sessionName = sessionArg.split("/").pop()?.replace(".jsonl", "") || "unknown";
    const outFile = `dataset-${sessionName}.jsonl`;
    // Override OUTPUT for this instance
    (globalThis as any).__OUTPUT = outFile;
    if (existsSync(outFile)) writeFileSync(outFile, "");
    console.log(`Single session mode: ${sessionArg} → ${outFile}`);
    const total = await processSession(sessionArg);
    console.log(`\n=== Done! ${total} samples → ${outFile} ===`);
    return;
  }

  // Default: find and process top 5
  if (existsSync(OUTPUT)) writeFileSync(OUTPUT, "");

  const allSessions = findSessions(SESSIONS_DIR);
  console.log(`Found ${allSessions.length} sessions > 100KB`);

  const sorted = allSessions
    .map((p) => ({ path: p, size: statSync(p).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_SESSIONS);

  console.log(`\nProcessing ${sorted.length} sessions:`);
  for (const s of sorted) {
    console.log(`  ${(s.size / 1024 / 1024).toFixed(1)}MB — ${s.path.split("/").slice(-2).join("/")}`);
  }

  let total = 0;
  for (const s of sorted) {
    total += await processSession(s.path);
  }

  console.log(`\n=== Done! Total samples: ${total} ===`);
}

main().catch(console.error);
