import { describe, it, expect } from 'vitest';
import { serialTask } from './serial-task';

/** A task that reports the highest number of simultaneous executions it ever saw. */
function concurrencyProbe() {
  let active = 0;
  let peak = 0;
  let runs = 0;
  let release: (() => void) | null = null;

  const task = async () => {
    active += 1;
    runs += 1;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    active -= 1;
  };

  return {
    task,
    get peak() {
      return peak;
    },
    get runs() {
      return runs;
    },
    /** Let the currently running invocation finish. */
    finish: async () => {
      release?.();
      release = null;
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe('serialTask', () => {
  it('never runs the task concurrently', async () => {
    const probe = concurrencyProbe();
    const run = serialTask(probe.task);

    run();
    run();
    run();
    run();

    expect(probe.peak).toBe(1);
    expect(probe.runs).toBe(1);

    await probe.finish();
    expect(probe.peak).toBe(1);
  });

  it('coalesces a burst into exactly one trailing re-run', async () => {
    const probe = concurrencyProbe();
    const run = serialTask(probe.task);

    // One saveConfig() fires up to four storage events.
    run();
    run();
    run();
    run();
    expect(probe.runs).toBe(1);

    await probe.finish();
    // The three queued triggers collapse into a single run that sees the final state.
    expect(probe.runs).toBe(2);

    await probe.finish();
    expect(probe.runs).toBe(2);
  });

  it('runs again for a trigger that arrives after the task settled', async () => {
    const probe = concurrencyProbe();
    const run = serialTask(probe.task);

    run();
    await probe.finish();
    expect(probe.runs).toBe(1);

    run();
    expect(probe.runs).toBe(2);
    await probe.finish();
  });

  it('does not wedge when the task rejects', async () => {
    let calls = 0;
    const run = serialTask(async () => {
      calls += 1;
      throw new Error('apply failed');
    });

    run();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // A rejection must clear the in-flight slot, or every later change is ignored
    // and the engine silently stops tracking the config.
    run();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(2);
  });
});
