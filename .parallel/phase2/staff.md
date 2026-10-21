# Phase 2 — Accounts & Staff

- Files: lib/staff.ts (new), app/account-screen.tsx (new), app/account/page.tsx (new), app/staff-screen.tsx (new), app/more-screen.tsx (+2 RowLinks: Business "My account", new "Team" section).
- Storage: `nova-pos-staff-v1` (member list), `nova-pos-current-staff` (signed-in id); seeds one owner "Owner" (id st_owner) on first load; store.ts persist untouched.
- Permissions: owner/supervisor → refund+editData+reports; cashier → reports only (can()). Screens: /staff read-only + warn card for non-owners; self role/deactivate locked.
- Picker pattern: copied from app/product-edit-screen.tsx (gallery + capture="environment" inputs → processImageFile → saveImageBlob → photoId as "idb:" ref; upsertStaff deletes replaced blob).
- Reactivity: useSyncExternalStore hooks useStaffList/useCurrentStaff inside lib/staff.ts; react-only, no store.ts changes.
- Verify: tsc --noEmit + eslint app components lib clean (only pre-existing lib/backup.ts errors remain).
- Blocked: none.
