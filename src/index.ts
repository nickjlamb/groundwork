// Programmatic API — everything the CLI can do, importable.
export { runInit, initFiles, ARCHETYPES, DEFAULT_ARCHETYPE } from "./commands/init.js";
export { runCheck } from "./commands/check.js";
export { runCost } from "./commands/cost.js";
export { loadConfig } from "./lib/config.js";
export type { InitOptions, ScaffoldFile } from "./commands/init.js";
export type { CheckOptions } from "./commands/check.js";
export type { CostOptions } from "./commands/cost.js";
export type { GroundworkConfig } from "./lib/config.js";
