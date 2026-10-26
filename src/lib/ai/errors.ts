/** Safe, actionable errors shared by the Gemini adapter and assistant route. */
export class AiGenerationError extends Error {
  constructor(message: string, public readonly status = 503) {
    super(message);
    this.name = "AiGenerationError";
  }
}
