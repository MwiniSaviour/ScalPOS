export const SCAN_HEADERS = [
  "name",
  "sku",
  "barcode",
  "price",
  "cost",
  "stock",
  "category",
  "unit",
  "low_stock_at",
  "description",
  "active",
] as const

export function barcodeToRow(barcode: string): string[] {
  const code = barcode.trim()
  return [
    "",
    "",
    code,
    "",
    "",
    "",
    "",
    "pcs",
    "5",
    "",
    "yes",
  ]
}

export function appendScannedBarcode(rows: string[][], barcode: string): string[][] {
  const code = barcode.trim()
  if (!code) return rows
  if (rows.some((row) => (row[2] ?? "").trim() === code)) return rows
  return [...rows, barcodeToRow(code)]
}
