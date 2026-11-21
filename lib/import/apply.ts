import { id } from "../format.ts"
import type { Category, Product, StockMove } from "../types.ts"
import type { ImportOptions, ImportResult, ImportRow } from "./validate.ts"

const UNITS: Product["unit"][] = ["pcs", "kg", "bag", "box", "ltr", "pack"]

function unitOf(value: string): Product["unit"] {
  const lower = value.trim().toLowerCase()
  return UNITS.find((unit) => unit === lower) ?? "pcs"
}

export function applyImportRows(
  rows: ImportRow[],
  options: ImportOptions,
  products: Product[],
  categories: Category[],
  stockMoves: StockMove[],
  now = Date.now(),
): {
  products: Product[]
  categories: Category[]
  stockMoves: StockMove[]
  result: ImportResult
} {
  const nextProducts = [...products]
  const nextCategories = [...categories]
  const nextMoves = [...stockMoves]
  let created = 0
  let updated = 0
  let skipped = 0

  const findProduct = (row: ImportRow): Product | undefined => {
    if (row.barcode) {
      const barcode = row.barcode.toLowerCase()
      const byBarcode = nextProducts.find((p) => p.barcode.trim().toLowerCase() === barcode)
      if (byBarcode) return byBarcode
    }
    if (row.sku) {
      const sku = row.sku.toLowerCase()
      return nextProducts.find((p) => p.sku.trim().toLowerCase() === sku)
    }
    return undefined
  }

  const resolveCategory = (name: string): string | null => {
    if (!name) return null
    const key = name.toLowerCase()
    const existing = nextCategories.find((c) => c.name.trim().toLowerCase() === key)
    if (existing) return existing.id
    if (!options.createCategories) return null
    const category: Category = { id: id("c_"), name: name.trim(), color: "#059669" }
    nextCategories.push(category)
    return category.id
  }

  for (const row of rows) {
    const match = findProduct(row)
    const categoryId = resolveCategory(row.category)
    if (match) {
      if (!options.updateExisting) {
        skipped += 1
        continue
      }
      const index = nextProducts.findIndex((p) => p.id === match.id)
      nextProducts[index] = {
        ...match,
        name: row.name,
        price: row.price,
        cost: row.cost_price,
        unit: unitOf(row.unit),
        lowStockAt: row.low_stock_at,
        description: row.description,
        active: row.active,
        sku: row.sku || match.sku,
        barcode: row.barcode || match.barcode,
        categoryId: categoryId ?? match.categoryId,
        updatedAt: now,
      }
      updated += 1
      continue
    }

    const product: Product = {
      id: id("p_"),
      name: row.name,
      sku: row.sku || id("sku").slice(0, 8),
      barcode: row.barcode,
      categoryId,
      cost: row.cost_price,
      price: row.price,
      stock: row.stock,
      lowStockAt: row.low_stock_at,
      unit: unitOf(row.unit),
      imageUrl: "",
      description: row.description,
      active: row.active,
      createdAt: now,
      updatedAt: now,
    }
    nextProducts.push(product)
    if (row.stock > 0) {
      nextMoves.push({
        id: id("mv_"),
        productId: product.id,
        qty: row.stock,
        reason: "opening",
        ref: "import",
        t: now,
      })
    }
    created += 1
  }

  return {
    products: nextProducts,
    categories: nextCategories,
    stockMoves: nextMoves,
    result: { created, updated, skipped },
  }
}
