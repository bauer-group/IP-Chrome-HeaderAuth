/**
 * Wrap an async task so it never overlaps itself, coalescing a burst of triggers
 * into at most one trailing re-run.
 *
 * The rule refresh is a read-modify-write against the declarativeNetRequest engine:
 * it reads the installed rule ids, then replaces them. Two overlapping runs both read
 * the OLD id set, so the later write carries a removeRuleIds list that misses the id
 * the earlier write just added — and `updateDynamicRules` rejects a duplicate rule id
 * atomically, leaving a failure recorded for what was in fact a correct config.
 *
 * That is not hypothetical: one `saveConfig()` performs up to four separate storage
 * writes (sync.remove, sync.set, local.set, local.remove), each firing its own
 * `storage.onChanged`. Adding a second rule was enough to trigger it.
 *
 * Trailing rather than leading: the last trigger is the one that knows the final
 * state, so a burst must end with a run that starts after every write has landed.
 */
export function serialTask(task: () => Promise<void>): () => void {
  let inFlight: Promise<void> | null = null;
  let queued = false;

  const run = (): void => {
    if (inFlight) {
      queued = true;
      return;
    }
    inFlight = (async () => {
      try {
        await task();
      } catch {
        // The task owns its own error reporting. Swallowing here keeps this
        // fire-and-forget wrapper from becoming the unhandled rejection it exists
        // to prevent — and a rejection must still free the slot below, or one
        // failure would silently stop every later refresh.
      } finally {
        inFlight = null;
        if (queued) {
          queued = false;
          run();
        }
      }
    })();
  };

  return run;
}
