import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// WxtVitest() wires up WXT's aliases and auto-mocks `wxt/browser` with
// @webext-core/fake-browser, so the modules that import the browser global are
// testable without hand-written mocks.
//
// The include glob covers .tsx as well as .ts: it previously matched only
// `src/**/*.test.ts`, so a component test would have been collected by nothing
// and silently never run — a trap that surfaces the first time someone writes
// one and believes the green result.
//
// The environment stays `node`. jsdom costs ~10s of setup PER TEST FILE here
// (measured: 1.3s -> 60.7s across six files) and nothing currently needs it —
// fakeBrowser is a pure in-memory implementation. A test that does need a DOM
// opts in per file with a docblock on line 1:
//
//     // @vitest-environment jsdom
//
// jsdom is installed and ready for exactly that.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      // Exercised through components rather than unit tests; including them
      // would drag the lib threshold down without adding signal.
      exclude: ['src/lib/hooks/**', 'src/lib/i18n/**'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
