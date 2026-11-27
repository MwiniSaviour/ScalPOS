# Mobile breadcrumb navigation design

Date: 2026-11-25
Status: approved (mobile only)

## Goal

Show pathname-derived breadcrumb links above mobile screen titles, matching the
`System > Storage > Storage Spaces` pattern: earlier segments are links, the
current segment is plain text with `aria-current="page"`.

## Components

- `lib/breadcrumbs.ts`: pure `crumbsForPath(pathname)` returning
  `{ label, href? }[]`. Handles list/detail/edit routes and query strings.
  No React or aliases so it is unit-testable with `node --test`.
- `components/ui/breadcrumbs.tsx`: presentational component rendering the crumb
  row and `›` separators using existing design tokens.
- `components/shell/screenheader.tsx`: derives crumbs from `usePathname()` by
  default and renders them above the title. Optional `crumbs` prop overrides;
  `showBreadcrumbs={false}` opts out for modal-like screens.

## Behaviour

- Root/home crumb is `Home` linking to `/home`.
- Detail/edit pages show their parent list as a link, for example
  `Home › Inventory › Product detail`.
- Query strings (`?id=`) are ignored when matching routes.
- Unknown paths fall back to a single plain `Home` crumb rather than broken links.
- Desktop/Electron UI is unchanged.

## Testing

- Unit tests for route mapping, query-string handling, and unknown paths.
- Visual check of a list and a detail screen in the mobile app.
