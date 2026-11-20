export type ParsedTable = {
  format: "csv" | "xlsx"
  headers: string[]
  rows: string[][]
  rowNumbers: number[]
  headerRow: number
  sheet?: string
}

type RowRecord = { cells: string[]; row: number }

function tableFromRecords(
  records: RowRecord[],
  format: ParsedTable["format"],
  sheet?: string,
): ParsedTable {
  const first = records[0]
  return {
    format,
    headers: first?.cells ?? [],
    rows: records.slice(1).map((record) => record.cells),
    rowNumbers: records.slice(1).map((record) => record.row),
    headerRow: first?.row ?? 1,
    sheet,
  }
}

function parseCsvRecords(text: string): RowRecord[] {
  const source = text.replace(/^\uFEFF/, "")
  const records: RowRecord[] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let line = 1
  let rowStart = 1

  const finishRow = () => {
    row.push(field)
    records.push({ cells: row, row: rowStart })
    row = []
    field = ""
  }

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && source[i + 1] === "\n") i += 1
        field += "\n"
        line += 1
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"' && field.length === 0) {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && source[i + 1] === "\n") i += 1
      finishRow()
      line += 1
      rowStart = line
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) finishRow()
  return records
}

export function parseCsv(text: string): ParsedTable {
  return tableFromRecords(parseCsvRecords(text), "csv")
}

async function inflateRaw(input: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(input.byteLength)
  copy.set(input)
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const decoder = new TextDecoder("utf-8")
  const entries = new Map<string, Uint8Array>()
  const min = Math.max(0, bytes.length - 22)
  let eocd = -1
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Invalid or unsupported XLSX file")

  const count = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  for (let i = 0; i < count; i += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))

    if (localOffset + 30 <= bytes.length && view.getUint32(localOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localOffset + 26, true)
      const localExtraLength = view.getUint16(localOffset + 28, true)
      const start = localOffset + 30 + localNameLength + localExtraLength
      const compressed = bytes.subarray(start, start + compressedSize)
      let data: Uint8Array
      if (method === 0) data = compressed.slice()
      else if (method === 8) data = await inflateRaw(compressed)
      else throw new Error(`Unsupported XLSX compression method ${method}`)
      entries.set(name, data)
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
}

function attrsFromString(value: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of value.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    attrs[match[1]] = decodeXml(match[3])
  }
  return attrs
}

function xmlText(entries: Map<string, Uint8Array>, name: string): string {
  const data = entries.get(name)
  return data ? new TextDecoder("utf-8").decode(data) : ""
}

function sharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g), (match) =>
    Array.from(match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (t) => decodeXml(t[1])).join(""),
  )
}

function sheetPath(workbook: string, rels: string): string {
  const sheet = workbook.match(/<sheet\b[^>]*>/)?.[0] ?? ""
  const relationId = attrsFromString(sheet)["r:id"] ?? "rId1"
  const relations = Array.from(rels.matchAll(/<Relationship\b[^>]*>/g), (match) => attrsFromString(match[0]))
  const target = relations.find((rel) => rel.Id === relationId)?.Target ?? "worksheets/sheet1.xml"
  const raw = target.startsWith("/")
    ? target.slice(1)
    : target.startsWith("xl/")
      ? target
      : `xl/${target}`
  const parts: string[] = []
  for (const part of raw.replace(/\\/g, "/").split("/")) {
    if (part === "..") parts.pop()
    else if (part && part !== ".") parts.push(part)
  }
  return parts.join("/")
}

function columnIndex(reference: string): number {
  const match = reference.match(/^([A-Z]+)/i)
  if (!match) return 1
  let index = 0
  for (const ch of match[1].toUpperCase()) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index
}

function cellValue(inner: string, type: string, strings: string[]): string {
  if (type === "inlineStr") {
    return Array.from(inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (match) => decodeXml(match[1])).join("")
  }
  const raw = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? ""
  if (type === "s") {
    const index = Number.parseInt(raw, 10)
    return strings[index] ?? ""
  }
  if (type === "b") return raw === "1" ? "true" : "false"
  return decodeXml(raw)
}

function parseSheet(xml: string, strings: string[]): RowRecord[] {
  const records: RowRecord[] = []
  let nextRow = 1
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowAttrs = attrsFromString(rowMatch[1])
    const rowNumber = Number.parseInt(rowAttrs.r ?? "", 10) || nextRow
    const cells: string[] = []
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = attrsFromString(cellMatch[1])
      const index = attrs.r ? columnIndex(attrs.r) - 1 : cells.length
      while (cells.length <= index) cells.push("")
      cells[index] = cellValue(cellMatch[2] ?? "", attrs.t ?? "", strings)
    }
    records.push({ cells, row: rowNumber })
    nextRow = rowNumber + 1
  }
  return records
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedTable> {
  const entries = await unzip(buffer)
  const workbook = xmlText(entries, "xl/workbook.xml")
  const rels = xmlText(entries, "xl/_rels/workbook.xml.rels")
  let path = workbook ? sheetPath(workbook, rels) : ""
  let xml = path ? xmlText(entries, path) : ""
  if (!xml) {
    const fallback = Array.from(entries.keys()).find(
      (name) => /^xl\/worksheets\/[^/]+\.xml$/.test(name) && !name.includes("_rels"),
    )
    if (fallback) {
      path = fallback
      xml = xmlText(entries, fallback)
    }
  }
  if (!xml) throw new Error("No worksheet found in XLSX file")
  return tableFromRecords(parseSheet(xml, sharedStrings(xmlText(entries, "xl/sharedStrings.xml"))), "xlsx", path)
}

export async function parseImportFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv") || file.type === "text/csv") return parseCsv(await file.text())
  if (name.endsWith(".xlsx") || file.type.includes("spreadsheetml")) return parseXlsx(await file.arrayBuffer())
  throw new Error("Choose a .csv or .xlsx file")
}
