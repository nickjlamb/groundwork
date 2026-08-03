// `groundwork init` — scaffold the deployment-readiness harness into a repo.
// Pure core (initFiles returns { path, content } pairs); runInit does the I/O
// and never overwrites without --force. Filled in at the scaffolder stage.

export interface InitOptions {
  dir: string;
  force: boolean;
}

export interface ScaffoldFile {
  path: string; // relative to the target repo root
  content: string;
}

/** The files `groundwork init` writes. Placeholder until the scaffolder stage. */
export function initFiles(): ScaffoldFile[] {
  return [];
}

export async function runInit(opts: InitOptions): Promise<void> {
  process.stdout.write(
    `groundwork init — scaffolder not wired up yet (target: ${opts.dir})\n`
  );
}
