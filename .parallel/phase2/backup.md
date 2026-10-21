Backup / recovery — phase 2 report

- Persist key used: `nova-pos-v1` (zustand persist, default version 0; blob `{state, version}` backed up/restored verbatim, `schemaVersion` is a pure copy; restore = localStorage.setItem + location.reload()).
- Image API used: exported `listImageRefs` + `getImageBlob` (FileReader → base64 data URLs); import opens IndexedDB `nova-pos-images` v1 store `images` directly (no public put-with-id exists there) with id-dedupe; >10 MB → skip photos + warn toast; toggle on /backup screen.
- GIS flow notes: `accounts.google.com/gsi/client` injected on demand, `initTokenClient` implicit token, scope drive.file; token+expiry in localStorage `nova-pos-drive-token`, client ID stored in `nova-pos-gsi-clientid` (entered once via Connect sheet, origin shown for Cloud Console setup); 401 → clear token → re-open Connect sheet then auto-continue original save/restore; file "NovaPOS-backup.json" via multipart create/PATCH, list+alt=media download for restore.
- Restore = preview-first summary card (counts, created, schema version vs register version) → Confirm tone danger ("This replaces everything…") → images imported first → store blob → reload; newer schemaVersion refused with clear message.
- Offline: `useNet()` gates Drive buttons ("You're offline — local save still works"); device save uses @capacitor/filesystem Documents + @capacitor/share on native, `<a download>` on web; file input accept="application/json".
- X on lint: lint used only before build. No codegen.
- Blocked: none — tsc and eslint pass on my files (and whole tree).
