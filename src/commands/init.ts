// `groundwork init [archetype]` — scaffold the deployment-readiness harness
// for a deployment pattern into a repo.
//
// Groundwork's units are deployment patterns, not products — `init` scaffolds
// the whole harness for one. Templates live as real files in templates/
// (shipped with the package), per-archetype under templates/<archetype>/ with
// pattern-neutral files hoisted into templates/shared/, so they can be read,
// linted, and improved like any other code. initFiles() is pure — it returns
// { path, content } pairs; runInit does the I/O and never overwrites without
// --force.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");

/** The deployment patterns `init` can scaffold. */
export const ARCHETYPES: Record<string, { summary: string; nextSteps: string[] }> = {
  "document-qa": {
    summary: "documents → retrieval → grounded answers → human review",
    nextSteps: [
      "Edit groundwork/adapter.mjs — point answer() at your system",
      "Replace the example cases in groundwork/datasets/cases/ with real ones",
      "Run: npx @pharmatools/groundwork check",
    ],
  },
  extraction: {
    summary: "documents → structured fields → schema validation → human review",
    nextSteps: [
      "Edit groundwork/adapter.mjs — point extract() at your system",
      "Write your record schema — nullable fields are the abstention contract",
      "Label real documents as gold in groundwork/datasets/cases/ (null = not stated)",
      "Run: npx @pharmatools/groundwork check",
    ],
  },
};

export const DEFAULT_ARCHETYPE = "document-qa";

export interface InitOptions {
  dir: string;
  force: boolean;
  archetype?: string;
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
  "DEPLOYMENT-LOG.md": "groundwork/DEPLOYMENT-LOG.md",
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

export function assertKnownArchetype(archetype: string): void {
  if (!(archetype in ARCHETYPES)) {
    const known = Object.entries(ARCHETYPES)
      .map(([name, a]) => `  ${name.padEnd(14)} ${a.summary}`)
      .join("\n");
    throw new Error(
      `unknown archetype "${archetype}". Available deployment patterns:\n${known}`
    );
  }
}

/** The files `groundwork init <archetype>` writes, with {{PROJECT_NAME}} interpolated. */
export function initFiles(
  projectName: string,
  archetype: string = DEFAULT_ARCHETYPE
): ScaffoldFile[] {
  assertKnownArchetype(archetype);
  const roots = [join(TEMPLATES, "shared"), join(TEMPLATES, archetype)];
  return roots.flatMap((root) =>
    walk(root).map((rel) => {
      const content = readFileSync(join(root, rel), "utf8").replaceAll(
        "{{PROJECT_NAME}}",
        projectName
      );
      const dest =
        DESTINATIONS[rel] ??
        // everything else (datasets/**) lands under groundwork/ unchanged
        join("groundwork", rel).split(sep).join("/");
      return { path: dest, content };
    })
  );
}

export async function runInit(opts: InitOptions): Promise<void> {
  const archetype = opts.archetype ?? DEFAULT_ARCHETYPE;
  assertKnownArchetype(archetype);
  const projectName = projectNameFor(opts.dir);
  const files = initFiles(projectName, archetype);

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
  out.write(`\ngroundwork init — ${projectName} (archetype: ${archetype})\n\n`);
  for (const p of written) out.write(`  + ${p}\n`);
  for (const p of skipped) out.write(`  = ${p} (exists — kept; use --force to overwrite)\n`);

  out.write(`\nNext steps (the full walkthrough is in GROUNDWORK.md):\n`);
  ARCHETYPES[archetype].nextSteps.forEach((step, i) => {
    out.write(`  ${i + 1}. ${step}\n`);
  });
  out.write(
    `\nGroundwork is a strong floor, not a guarantee — keep a human in the loop\n` +
      `for outputs that affect someone's health, money, legal standing, or safety.\n\n`
  );
}
