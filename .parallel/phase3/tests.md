Files: tests/integration/sync.test.ts, .github/workflows/ci.yml, package.json (test script), tsconfig.json (exclude tests).
Skip: env-gated describe skips when SUPABASE_* unset; IndexedDB assertions skip with message when fake-indexeddb missing.
Verified: npm test runs (2 suites skipped) without crash; tsc --noEmit passes; eslint app/components/lib/tests passes.
Blocked: live Supabase integration unverified (no Docker/env on host); CI supabase job requires runner Docker.
