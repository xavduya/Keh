// Explicit opt-in smoke check: real Gemini, synthetic context, no database writes.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd());
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/ai/live.test.ts"], {
  stdio: "inherit",
  env: { ...process.env, KEH_LIVE_AI_TEST: "true" },
});
process.exitCode = result.status ?? 1;
