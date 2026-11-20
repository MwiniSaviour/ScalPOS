import { importProducts } from "../api/data"
import type { ImportOptions, ImportResult, ImportRow } from "./validate"

export type { ImportOptions, ImportResult, ImportRow } from "./validate"

export async function applyImport(rows: ImportRow[], options: ImportOptions): Promise<ImportResult> {
  return importProducts(rows, options)
}
