import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";

const client = new Anthropic();
const OUTPUT = "dataset.jsonl";
const SAMPLES_PER_BAND = 150;
const BANDS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Sample {
  messages: Message[];
  score: number;
}

function bandDescription(score: number): string {
  if (score <= 0.1) return "trivial — simple greetings, factual lookups, unit conversions, one-word answers";
  if (score <= 0.3) return "easy — short summaries, simple explanations, basic code snippets, single-function tasks";
  if (score <= 0.5) return "medium — multi-step reasoning, moderate code with error handling, comparing tradeoffs, debugging simple issues";
  if (score <= 0.7) return "hard — complex refactoring, multi-file changes, system design questions, writing tests for edge cases, API integration";
  if (score <= 0.9) return "very hard — architecture design, security audits, performance optimization across systems, complex agentic multi-step workflows";
  return "hardest — distributed systems design, migrating entire architectures, cryptographic protocol review, multi-service orchestration with failure handling";
}

async function generateBatch(targetScore: number, count: number): Promise<Sample[]> {
  const turnMix = targetScore < 0.3
    ? "90% single-turn, 10% multi-turn (2 turns)"
    : targetScore < 0.6
      ? "60% single-turn, 40% multi-turn (2-3 turns)"
      : "40% single-turn, 60% multi-turn (3-5 turns)";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Generate exactly ${count} realistic conversations that a user would have with a coding/AI assistant.

Target complexity: ${targetScore.toFixed(1)} on a 0.0–1.0 scale.
Complexity level: ${bandDescription(targetScore)}

Turn distribution: ${turnMix}

Each conversation MUST include:
- A system prompt (role: "system") describing the assistant's role/context
- One or more user messages (role: "user")
- For multi-turn: include assistant responses between user messages

Vary the domains: web dev, backend, DevOps, data science, mobile, security, databases, ML, etc.

Output ONLY a valid JSON array. Each element:
{
  "messages": [{"role": "system"|"user"|"assistant", "content": "..."}],
  "score": ${targetScore.toFixed(1)}
}

No markdown, no explanation. Just the JSON array.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const parsed = JSON.parse(text) as Sample[];
    return parsed.filter(
      (s) => Array.isArray(s.messages) && s.messages.length >= 2 && typeof s.score === "number",
    );
  } catch {
    console.error(`Failed to parse response for band ${targetScore}`);
    return [];
  }
}

async function main() {
  if (!existsSync(OUTPUT)) writeFileSync(OUTPUT, "");

  let total = 0;
  for (const band of BANDS) {
    console.log(`\nGenerating band ${band.toFixed(1)} (${bandDescription(band).split("—")[0].trim()})...`);

    // Generate in sub-batches of 50 to stay within token limits
    const batchSize = 50;
    const batches = Math.ceil(SAMPLES_PER_BAND / batchSize);

    for (let i = 0; i < batches; i++) {
      const count = Math.min(batchSize, SAMPLES_PER_BAND - i * batchSize);
      console.log(`  Batch ${i + 1}/${batches} (${count} samples)...`);

      try {
        const samples = await generateBatch(band, count);
        for (const sample of samples) {
          appendFileSync(OUTPUT, JSON.stringify(sample) + "\n");
        }
        total += samples.length;
        console.log(`  Got ${samples.length} samples (total: ${total})`);
      } catch (err) {
        console.error(`  Error on batch ${i + 1}:`, (err as Error).message);
      }

      // Rate limit courtesy
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone! Total samples: ${total}`);
  console.log(`Output: ${OUTPUT}`);
}

main().catch(console.error);
