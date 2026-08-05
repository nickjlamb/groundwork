// Run the example's full check against the local mock API — no key, no
// network. This is what `npm run example:extraction:mock` and the test suite
// use. MOCK_FABRICATE=1 makes the mock guess a date of birth the letter never
// states, so you can watch the gate name it.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startMockServer } from "./mock-server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The server lives in THIS process's event loop, so the check must run as an
// async child (spawnSync would block the loop and deadlock the mock).
const { server, url } = await startMockServer();

const child = spawn(
  process.execPath,
  [join(ROOT, "dist", "cli.js"), "check", "--dir", "examples/claude-extraction", ...process.argv.slice(2)],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ANTHROPIC_BASE_URL: url, ANTHROPIC_API_KEY: "mock" },
  }
);

const code = await new Promise((resolve) => child.on("close", resolve));
server.close();
process.exit(code ?? 1);
