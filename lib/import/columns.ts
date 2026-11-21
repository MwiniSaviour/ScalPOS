export type ImportField =
  | "name"
  | "sku"
  | "barcode"
  | "price"
  | "cost_price"
  | "stock"
  | "category"
  | "unit"
  | "low_stock_at"
  | "description"
  | "active"

export const REQUIRED_FIELDS: readonly ImportField[] = ["name"]

export const FIELD_LABELS: Record<ImportField, string> = {
  name: "Name",
  sku: "SKU",
  barcode: "Barcode",
  price: "Price",
  cost_price: "Cost price",
  stock: "Stock",
  category: "Category",
  unit: "Unit",
  low_stock_at: "Low stock at",
  description: "Description",
  active: "Active",
}

const ALIASES: Record<ImportField, readonly string[]> = {
  name: ["name", "product", "product name", "item"],
  sku: ["sku", "code", "product code", "item code"],
  barcode: ["barcode", "bar code", "ean", "upc"],
  price: ["price", "selling", "selling price", "retail", "retail price", "unit price", "sale price"],
  cost_price: ["cost", "cost price", "buying", "purchase price"],
  stock: ["stock", "qty", "quantity", "opening stock", "on hand"],
  category: ["category", "category name", "group", "department"],
  unit: ["unit", "uom"],
  low_stock_at: ["low stock", "low stock at", "reorder level", "min stock", "alert qty"],
  description: ["description", "notes", "details"],
  active: ["active"],
}

const ALIAS_MAP = new Map<string, ImportField>()
for (const field of Object.keys(ALIASES) as ImportField[]) {
  for (const alias of ALIASES[field]) ALIAS_MAP.set(alias, field)
}

export const TEMPLATE_HEADERS: readonly string[] = [
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
]

export const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(",")}
Sample product,SKU001,1234567890123,25.00,15.00,12,Rice,pack,5,Pack of 5 kg
`

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\*+$/, "")
    .trim()
}

export type HeaderMap = {
  fields: (ImportField | null)[]
  unknown: string[]
  missingRequired: ImportField[]
}

export function mapHeaders(headers: readonly string[]): HeaderMap {
  const fields: (ImportField | null)[] = []
  const unknown: string[] = []
  const seen = new Set<ImportField>()

  for (const raw of headers) {
    const key = normalizeHeader(raw)
    if (!key) {
      fields.push(null)
      continue
    }
    const field = ALIAS_MAP.get(key)
    if (!field || seen.has(field)) {
      fields.push(null)
      if (!unknown.includes(key)) unknown.push(key)
      continue
    }
    seen.add(field)
    fields.push(field)
  }

  return {
    fields,
    unknown,
    missingRequired: REQUIRED_FIELDS.filter((field) => !seen.has(field)),
  }
}
