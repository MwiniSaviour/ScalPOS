function parseNumberToken(token: string): number | null {
  const cleaned = token.replace(/GH₵/gi, "").replace(/[₵$]/g, "").replace(/,/g, "")
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function trailingNumberTokens(tokens: string[]): number[] {
  const values: number[] = []
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const value = parseNumberToken(tokens[index])
    if (value === null) break
    values.unshift(value)
  }
  return values
}

export const INVOICE_HEADERS = [
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

export function parseInvoiceText(text: string): string[][] {
  const rows: string[][] = []
  const seen = new Set<string>()

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.length < 4) continue
    if (/^(invoice|receipt|date|total|subtotal|tax|vat|amount|qty|quantity|price|item|description|thank|cashier)/i.test(line)) continue
    if (/^\W+$/.test(line)) continue

    const tokens = line.split(/\s+/)
    const trailing = trailingNumberTokens(tokens)
    const leadingQty = tokens.length > 0 ? parseNumberToken(tokens[0]) : null

    let stock = ""
    let price = ""
    let nameTokens = tokens

    if (leadingQty !== null && trailing.length >= 2) {
      const total = trailing[trailing.length - 1]
      const unitPrice = trailing[trailing.length - 2]
      if (Math.abs(leadingQty * unitPrice - total) < 0.051) {
        stock = String(Math.max(1, Math.round(leadingQty)))
        price = String(unitPrice)
        nameTokens = tokens.slice(1, tokens.length - trailing.length)
      }
    }

    if (!stock && trailing.length >= 2) {
      stock = String(Math.max(1, Math.round(trailing[0])))
      price = String(trailing[1])
      nameTokens = tokens.slice(0, tokens.length - trailing.length)
    }

    if (!price && trailing.length === 1) {
      price = String(trailing[0])
      stock = "1"
      nameTokens = tokens.slice(0, tokens.length - 1)
    }

    const name = nameTokens.join(" ").trim()
    if (name.length < 2) continue
    if (seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())

    rows.push([
      name,
      "",
      "",
      price,
      "",
      stock || "1",
      "",
      "pcs",
      "5",
      "Imported from invoice",
      "yes",
    ])
  }

  return rows
}
