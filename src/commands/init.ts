// `groundwork init` — scaffold the deployment-readiness harness into a repo.
//
// Templates live as real files in templates/ (shipped with the package), so
// they can be read, linted, and improved like any other code. initFiles() is
// pure — it returns { path, content } pairs; runInit does the I/O and never
// overwrites without --force.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");

export interface InitOptions {
  dir: string;
  force: boolean;
}

export interface ScaffoldFile {
  path: string; // relative to the target repo root
  content: string;
}

/** Where each template lands in the partner's repo. */
const DESTINATIONS: Record<string, string> = {
  "groundwork.config.json": "groundwork/groundwork.config.json",
  "adapter.mjs": "groundwork/adapter.mjs",
  "redaction.config.json": "groundwork/redaction.config.json",
  "GROUNDWORK.md": "GROUNDWORK.md",
  [join("workflows", "groundwork.yml")]: ".github/workflows/groundwork.yml",
};

function walk(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [relative(base, full)];
  });
}

function projectNameFor(dir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (typeof pkg.name === "string" && pkg.name.length > 0) return pkg.name;
  } catch {
    /* no package.json — fall through */
  }
  return dir.split(sep).filter(Boolean).pop() ?? "my-project";
}

/** The files `groundwork init` writes, with {{PROJECT_NAME}} interpolated. */
export function initFiles(projectName: string): ScaffoldFile[] {
  return walk(TEMPLATES).map((rel) => {
    const content = readFileSync(join(TEMPLATES, rel), "utf8").replaceAll(
      "{{PROJECT_NAME}}",
      projectName
    );
    const dest =
      DESTINATIONS[rel] ??
      // everything else (datasets/**) lands under groundwork/ unchanged
      join("groundwork", rel).split(sep).join("/");
    return { path: dest, content };
  });
}

export async function runInit(opts: InitOptions): Promise<void> {
  const projectName = projectNameFor(opts.dir);
  const files = initFiles(projectName);

  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const target = join(opts.dir, file.path);
    if (existsSync(target) && !opts.force) {
      skipped.push(file.path);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
    written.push(file.path);
  }

  const out = process.stdout;
  out.write(`\ngroundwork init — ${projectName}\n\n`);
  for (const p of written) out.write(`  + ${p}\n`);
  for (const p of skipped) out.write(`  = ${p} (exists — kept; use --force to overwrite)\n`);

  out.write(`\nNext steps (the full walkthrough is in GROUNDWORK.md):\n`);
  out.write(`  1. Edit groundwork/adapter.mjs — point answer() at your system\n`);
  out.write(`  2. Replace the example cases in groundwork/datasets/cases/ with real ones\n`);
  out.write(`  3. Run: npx @pharmatools/groundwork check\n`);
  out.write(
    `\nGroundwork is a strong floor, not a guarantee — keep a human in the loop\n` +
      `for answers that affect someone's health, money, legal standing, or safety.\n\n`
  );
}
