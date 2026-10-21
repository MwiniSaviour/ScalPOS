Track A backend delivered under backend/ (config.toml, 4 migrations, 3 edge functions, 2 Node tests, README, .env.example); package.json already updated (scripts + @supabase/supabase-js).
Supabase CLI installed (v2.121.0 via linux arm64 binary + grun wrapper); Docker unavailable on host.
Migrations applied cleanly to a shimmed Postgres 18 cluster (syntax + triggers validated); moddatetime trigger bump verified.
Tests could not run: supabase start/db test require Docker; node integration tests require SUPABASE_* env from a running stack.
Blocked: local Supabase stack (auth/storage/realtime) cannot start without Docker; RLS execution not exercised here.
RLS hard-delete/soft-delete/role-gating assertions are present in tests/rls.test.ts but unrun.