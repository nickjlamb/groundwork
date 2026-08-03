// `groundwork check` — run the local readiness loop: Redacta redaction
// pre-step, then the OpenGATE grounding eval against the repo's gold set.
// Returns a process exit code (0 pass, 1 fail). Filled in at the wiring stage.

export interface CheckOptions {
  dir: string;
}

export async function runCheck(opts: CheckOptions): Promise<number> {
  process.stdout.write(
    `groundwork check — not wired up yet (target: ${opts.dir})\n`
  );
  return 0;
}
