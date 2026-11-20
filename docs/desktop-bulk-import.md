# Desktop bulk product import

Desktop-only CSV/XLSX import for the products catalog. It keeps the existing desktop UI and offline-first behavior unchanged, and it does not add a runtime parser dependency.

## Scope

- Desktop app only (`apps/desktop`).
- Import files: `.csv` (UTF-8, RFC 4180) and `.xlsx` (modern OOXML only).
- Three-step wizard: choose file, preview/validate, run.
- Cloud import is atomic through one `import_products` RPC.
- Local-only shops import directly into IndexedDB.

Deferred: mobile/Android import (planned after the barcode scanning loop and invoice/OCR extraction are fully implemented), paste grid, barcode scanning loop, invoice/OCR extraction, legacy `.xls`, encrypted workbooks, ZIP64 workbooks.

## File format

First non-empty row is the header row. Empty rows are ignored. Recognized columns (case-insensitive; spaces collapsed; trailing `*` ignored):

| Field | Aliases |
| --- | --- |
| `name` | name, product, product name, item |
| `sku` | sku, code, product code, item code |
| `barcode` | barcode, bar code, ean, upc |
| `price` | price, selling, selling price, retail, retail price, unit price, sale price |
| `cost_price` | cost, cost price, buying, purchase price |
| `stock` | stock, qty, quantity, opening stock, on hand |
| `category` | category, category name, group, department |
| `unit` | unit, uom |
| `low_stock_at` | low stock, low stock at, reorder level, min stock, alert qty |
| `description` | description, notes, details |
| `active` | active |

Unrecognized columns are reported and ignored. `name` is required. Template:

```csv
name,sku,barcode,price,cost,stock,category,unit,low_stock_at,description
```

## Parsing

CSV is parsed with a small RFC 4180 reader: quoted fields, doubled quotes, CRLF/LF, BOM stripping, physical row numbers preserved for errors.

XLSX is read without external libraries: ZIP central directory scan, `DecompressionStream("deflate-raw")` for compressed members, XML parsing for `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/sharedStrings.xml`, and the first worksheet. Shared strings, inline strings, numbers, booleans, formulas' cached values, and cell references are supported. CRC and ZIP64 are not verified.

## Validation

- `name` must be non-empty.
- Numeric values strip `,`, `GH₵`, `₵`, and `$` before parsing.
- `price`, `cost_price` must be finite and `>= 0`; defaults are `0`.
- `stock`, `low_stock_at` must be non-negative integers; defaults are `0` and `5`.
- `active` accepts `true/false/yes/no/1/0/y/n/active/inactive`; default `true`.
- `unit` defaults to `pcs`.
- Duplicate barcodes/SKUs inside the file are flagged on the later row.
- Errors use 1-based spreadsheet row numbers. Rows with any error are excluded.

## Upsert rules

- Match existing products by barcode first, then SKU, case-insensitive.
- Keep the matched-by-barcode SKU on update; only overwrite SKU/barcode when the file value is non-empty.
- `updateExisting` (default on) controls updates for matched products.
- Import never changes the stock of an existing product. New products receive the file stock as opening stock.
- Matched-product stock change is a delta (`target - current`).
- Categories are matched by lowercased name; `createCategories` (default on) creates missing ones.
- Cloud writes one row from each valid file row into `import_products`; the RPC owns all product/category/stock mutations and returns `{ created, updated, skipped }`.
- Local-only shops do the same matching and creation against IndexedDB. The local store has no `stock_moves`, so no local move rows are written.

## Cloud RPC

`public.import_products(p_org uuid, p_rows jsonb, p_update_existing boolean, p_set_stock boolean, p_create_categories boolean) returns jsonb`

- `security definer`, `search_path = public`.
- Requires a JWT subject and `public.has_org_role(p_org, array['owner','supervisor'])`.
- Requires `p_rows` to be a JSON array.
- New product stock writes a `stock_moves` row with reason `opening`, ref `import`.
- Existing product stock writes a `stock_moves` row with reason `count`, ref `import`.
- Product SKU/barcode uniqueness is application-level; concurrent imports can still race.

## Wizard behavior

1. Choose file: drop zone and file picker; template download.
2. Preview: mapped columns, ignored columns, first 50 valid rows, all row errors, and toggles for update/stock/categories.
3. Run: calls `importProducts`, shows `created/updated/skipped`, then reloads the catalog.

## Tests

- CSV quoted fields, BOM, CRLF, row numbers.
- Stored and deflated XLSX fixtures built in-test.
- Header aliases, validation errors, duplicate detection, and boolean/numeric parsing.

Run with `npm test` at the repo root. Verify with root `npm run typecheck` and desktop `tsc --noEmit` / `npm run build`.
