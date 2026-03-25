import * as ort from "onnxruntime-node";

export class ComplexityClassifier {
  private session: ort.InferenceSession;

  private constructor(session: ort.InferenceSession) {
    this.session = session;
  }

  static async load(modelPath: string): Promise<ComplexityClassifier> {
    const session = await ort.InferenceSession.create(modelPath);
    return new ComplexityClassifier(session);
  }

  /** Run classifier on a pre-computed embedding vector. Returns score 0.0-1.0. */
  async score(embedding: Float32Array): Promise<number> {
    const tensor = new ort.Tensor("float32", embedding, [1, embedding.length]);
    const output = await this.session.run({ embedding: tensor });
    const data = output.score.data as Float32Array;
    return data[0];
  }
}
