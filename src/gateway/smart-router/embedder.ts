import * as ort from "onnxruntime-node";
import { Tokenizer } from "tokenizers";

const WINDOWS_PER_CHANNEL = 12;
const EMBED_DIM = 384;
const MAX_CHARS = 30000;
const CHARS_PER_WINDOW = 1024;
const MAX_TOKENS = 256;

export interface ChannelTexts {
  user: string;
  assistant: string;
}

export class MiniLMEmbedder {
  private session: ort.InferenceSession;
  private tokenizer: Tokenizer;

  private constructor(session: ort.InferenceSession, tokenizer: Tokenizer) {
    this.session = session;
    this.tokenizer = tokenizer;
  }

  static async load(modelDir: string): Promise<MiniLMEmbedder> {
    const session = await ort.InferenceSession.create(`${modelDir}/model.onnx`);
    const tokenizer = Tokenizer.fromFile(`${modelDir}/tokenizer.json`);
    tokenizer.setTruncation(MAX_TOKENS);
    tokenizer.setPadding({ maxLength: MAX_TOKENS });
    return new MiniLMEmbedder(session, tokenizer);
  }

  /** Embed 2 channels and concatenate. Returns Float32Array of length WINDOWS_PER_CHANNEL * EMBED_DIM * 2. */
  async embedChannels(texts: ChannelTexts): Promise<Float32Array> {
    const [user, assistant] = await Promise.all([
      this.embedWindowed(texts.user || "[EMPTY]"),
      this.embedWindowed(texts.assistant || "[EMPTY]"),
    ]);
    const result = new Float32Array(user.length + assistant.length);
    result.set(user, 0);
    result.set(assistant, user.length);
    return result;
  }

  /** Embed a single text using windowed approach. Returns WINDOWS_PER_CHANNEL * EMBED_DIM floats. */
  async embedWindowed(text: string): Promise<Float32Array> {
    const truncated = text.slice(-MAX_CHARS);
    const windows = textToWindows(truncated);
    const result = new Float32Array(WINDOWS_PER_CHANNEL * EMBED_DIM);
    for (let i = 0; i < windows.length; i++) {
      if (windows[i] === "") continue; // zero-pad slot
      const vec = await this.embedSingle(windows[i]);
      result.set(vec, i * EMBED_DIM);
    }
    return result;
  }

  private async embedSingle(text: string): Promise<Float32Array> {
    const encoded = await this.tokenizer.encode(text);
    const ids = encoded.getIds();
    const mask = encoded.getAttentionMask();
    const typeIds = new Array(ids.length).fill(0) as number[];
    const inputIds = new ort.Tensor("int64", BigInt64Array.from(ids.map((n: number) => BigInt(n))), [1, ids.length]);
    const attentionMask = new ort.Tensor("int64", BigInt64Array.from(mask.map((n: number) => BigInt(n))), [
      1,
      mask.length,
    ]);
    const tokenTypeIds = new ort.Tensor("int64", BigInt64Array.from(typeIds.map((n: number) => BigInt(n))), [
      1,
      typeIds.length,
    ]);
    const output = await this.session.run({
      input_ids: inputIds,
      attention_mask: attentionMask,
      token_type_ids: tokenTypeIds,
    });
    // Mean pooling over token embeddings (only non-padding tokens)
    const hidden = output.last_hidden_state.data as Float32Array;
    const seqLen = ids.length;
    return meanPoolAndNormalize(hidden, mask, seqLen, EMBED_DIM);
  }
}

function textToWindows(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHARS_PER_WINDOW) {
    chunks.push(text.slice(i, i + CHARS_PER_WINDOW));
  }
  if (chunks.length === 0) chunks.push("[EMPTY]");
  if (chunks.length >= WINDOWS_PER_CHANNEL) {
    return chunks.slice(-WINDOWS_PER_CHANNEL);
  }
  // Zero-pad at START (old context slots empty, recent slots filled)
  return [...new Array<string>(WINDOWS_PER_CHANNEL - chunks.length).fill(""), ...chunks];
}

function meanPoolAndNormalize(hidden: Float32Array, mask: number[], seqLen: number, dim: number): Float32Array {
  const result = new Float32Array(dim);
  let tokenCount = 0;
  for (let t = 0; t < seqLen; t++) {
    if (mask[t] === 0) continue;
    tokenCount++;
    for (let d = 0; d < dim; d++) {
      result[d] += hidden[t * dim + d];
    }
  }
  if (tokenCount > 0) {
    for (let d = 0; d < dim; d++) result[d] /= tokenCount;
  }
  // L2 normalize
  let norm = 0;
  for (let d = 0; d < dim; d++) norm += result[d] * result[d];
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dim; d++) result[d] /= norm;
  return result;
}

export { WINDOWS_PER_CHANNEL, EMBED_DIM };
