Files: lib/sync/{types,outbox,client,realtime,conflict,merge}.ts, lib/api/supabase.ts, lib/net.ts, components/ui/syncstatus.tsx, components/shell/appshell.tsx
APIs: enqueue/drain/peek/clear; SyncClient upsert/softDelete/pull/push; subscribe; resolve; mergeRecords; useSyncStatus; getSupabase
Blocked: no fake-indexeddb (tests skip); tsc/eslint clean for lib/app/components
