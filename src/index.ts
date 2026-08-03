// Programmatic API — everything the CLI can do, importable.
export { runInit, initFiles } from "./commands/init.js";
export { runCheck } from "./commands/check.js";
export type { InitOptions, ScaffoldFile } from "./commands/init.js";
export type { CheckOptions } from "./commands/check.js";
