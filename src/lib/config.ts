// Load and validate groundwork.config.json from a target repo.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface GroundworkConfig {
  project: string;
  archetype: string;
  redaction: { enabled: boolean; configFile: string };
  eval: { adapter: string; datasets: string; results: string };
  gate?: { failBuildOnRegression?: boolean };
  review?: { humanInLoop?: boolean; notes?: string };
}

export const CONFIG_RELPATH = join("groundwork", "groundwork.config.json");

export function loadConfig(dir: string): GroundworkConfig {
  const path = join(dir, CONFIG_RELPATH);
  if (!existsSync(path)) {
    throw new Error(
      `no ${CONFIG_RELPATH} found in ${dir} — run \`groundwork init\` first.`
    );
  }
  const config = JSON.parse(readFileSync(path, "utf8")) as GroundworkConfig;
  if (!config.eval?.adapter || !config.eval?.datasets) {
    throw new Error(
      `${CONFIG_RELPATH} is missing eval.adapter or eval.datasets — ` +
        `restore them or re-run \`groundwork init --force\`.`
    );
  }
  return config;
}

/** Resolve a config-relative path against the repo root. */
export function resolveFromRepo(dir: string, p: string): string {
  return resolve(dir, p);
}
