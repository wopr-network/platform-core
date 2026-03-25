import { InferenceSession, Tensor } from "onnxruntime-node";

async function main() {
  const session = await InferenceSession.create("../../models/prompt-classifier.onnx");
  console.log("Model loaded. Inputs:", session.inputNames, "Outputs:", session.outputNames);

  // Fake embedding (384-dim for MiniLM)
  const fakeEmbedding = new Float32Array(384).fill(0.1);
  const tensor = new Tensor("float32", fakeEmbedding, [1, 384]);
  const result = await session.run({ embedding: tensor });
  const score = result.score.data[0];

  console.log(`Test score: ${score} (should be 0.0–1.0)`);
  console.log(score >= 0 && score <= 1 ? "PASS" : "FAIL");
}

main().catch(console.error);
