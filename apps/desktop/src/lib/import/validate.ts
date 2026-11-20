import { FIELD_LABELS, mapHeaders, type HeaderMap, type ImportField } from "./columns.ts"
import type { ParsedTable } from "./parse.ts"

type RowRecordLike = { cells: readonly string[]; row: number }

export type ImportRow = {
  name: string
  sku: string
  barcode: string
  price: number
  cost_price: number
  stock: number
  low_stock_at: number
  unit: string
  description: string
  category: string
  active: boolean
}

export type ImportOptions = {
  updateExisting: boolean
  setStock: boolean
  createCategories: boolean
}

export type ImportResult = {
  created: number
  updated: number
  skipped: number
}

export type RowIssue = {
  row: number
  field: ImportField
  message: string
}

export type ValidatedImport = {
  rows: ImportRow[]
  issues: RowIssue[]
  fields: (ImportField | null)[]
  unknownHeaders: string[]
  missingRequired: ImportField[]
  headerRow: number
  totalRows: number
}

function hasValue(cells: readonly string[]): boolean {
  return cells.some((cell) => cell.trim().length > 0)
}

function cleanNumber(raw: string): string {
  return raw
    .replace(/GH₵/gi, "")
    .replace(/[₵$]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
}

function parseNumber(
  raw: string,
  field: ImportField,
  row: number,
  fallback: number,
  issues: RowIssue[],
): number {
  const value = raw.trim()
  if (!value) return fallback
  const parsed = Number(cleanNumber(value))
  if (!Number.isFinite(parsed) || parsed < 0) {
    issues.push({ row, field, message: `${FIELD_LABELS[field]} must be a number of 0 or more.` })
    return fallback
  }
  return parsed
}

function parseInteger(
  raw: string,
  field: ImportField,
  row: number,
  fallback: number,
  issues: RowIssue[],
): number {
  const value = raw.trim()
  if (!value) return fallback
  const parsed = Number(cleanNumber(value))
  if (!Number.isInteger(parsed) || parsed < 0) {
    issues.push({ row, field, message: `${FIELD_LABELS[field]} must be a whole number of 0 or more.` })
    return fallback
  }
  return parsed
}

function parseBoolean(raw: string, row: number, issues: RowIssue[]): boolean {
  const value = raw.trim().toLowerCase()
  if (!value) return true
  if (["true", "yes", "1", "y", "active"].includes(value)) return true
  if (["false", "no", "0", "n", "inactive"].includes(value)) return false
  issues.push({ row, field: "active", message: "Active must be yes/no or true/false." })
  return true
}

export function validateTable(table: ParsedTable): ValidatedImport {
  const allRows: RowRecordLike[] = [
    { cells: table.headers, row: table.headerRow },
    ...table.rows.map((cells, index) => ({
      cells,
      row: table.rowNumbers[index] ?? table.headerRow + index + 1,
    })),
  ]
  const headerIndex = allRows.findIndex((record) => hasValue(record.cells))
  const headerMap: HeaderMap = mapHeaders(headerIndex >= 0 ? allRows[headerIndex].cells : [])
  const dataRows = headerIndex >= 0 ? allRows.slice(headerIndex + 1).filter((record) => hasValue(record.cells)) : []
  const issues: RowIssue[] = []
  const rows: ImportRow[] = []
  const seenBarcodes = new Map<string, number>()
  const seenSkus = new Map<string, number>()

  for (const record of dataRows) {
    const before = issues.length
    const values: Partial<Record<ImportField, string>> = {}
    for (const [index, field] of headerMap.fields.entries()) {
      if (field) values[field] = record.cells[index] ?? ""
    }

    const name = (values.name ?? "").trim()
    if (!name) issues.push({ row: record.row, field: "name", message: "Name is required." })

    const sku = (values.sku ?? "").trim()
    const barcode = (values.barcode ?? "").trim()
    if (barcode) {
      const key = barcode.toLowerCase()
      const prior = seenBarcodes.get(key)
      if (prior !== undefined) {
        issues.push({ row: record.row, field: "barcode", message: `Duplicate barcode; first used on row ${prior}.` })
      } else {
        seenBarcodes.set(key, record.row)
      }
    }
    if (sku) {
      const key = sku.toLowerCase()
      const prior = seenSkus.get(key)
      if (prior !== undefined) {
        issues.push({ row: record.row, field: "sku", message: `Duplicate SKU; first used on row ${prior}.` })
      } else {
        seenSkus.set(key, record.row)
      }
    }

    const price = parseNumber(values.price ?? "", "price", record.row, 0, issues)
    const cost_price = parseNumber(values.cost_price ?? "", "cost_price", record.row, 0, issues)
    const stock = parseInteger(values.stock ?? "", "stock", record.row, 0, issues)
    const low_stock_at = parseInteger(values.low_stock_at ?? "", "low_stock_at", record.row, 5, issues)
    const active = parseBoolean(values.active ?? "", record.row, issues)

    if (issues.length === before) {
      rows.push({
        name,
        sku,
        barcode,
        price,
        cost_price,
        stock,
        low_stock_at,
        unit: (values.unit ?? "").trim() || "pcs",
        description: (values.description ?? "").trim(),
        category: (values.category ?? "").trim(),
        active,
      })
    }
  }

  return {
    rows,
    issues,
    fields: headerMap.fields,
    unknownHeaders: headerMap.unknown,
    missingRequired: headerMap.missingRequired,
    headerRow: headerIndex >= 0 ? allRows[headerIndex].row : 1,
    totalRows: dataRows.length,
  }
}
