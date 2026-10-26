/** Server-side switch; retains API credentials while paused. */
export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED !== "false";
}
