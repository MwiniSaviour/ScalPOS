"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Check, Download, FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { FIELD_LABELS, TEMPLATE_CSV, TEMPLATE_HEADERS } from "@/lib/import/columns"
import { parseImportFile } from "@/lib/import/parse"
import { validateTable, type ImportOptions, type ImportResult, type ValidatedImport } from "@/lib/import/validate"
import { applyImport } from "@/lib/import/apply"
import { appendScannedBarcode } from "@/lib/import/scan"
import { parseInvoiceText } from "@/lib/import/invoice"

type Step = "choose" | "preview" | "done"
type Mode = "file" | "scan" | "invoice"

const DEFAULT_OPTIONS: ImportOptions = {
  updateExisting: true,
  createCategories: true,
}

function formatCell(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const [mode, setMode] = useState<Mode>("file")
  const [step, setStep] = useState<Step>("choose")
  const [file, setFile] = useState<File | null>(null)
  const [fileValidation, setFileValidation] = useState<ValidatedImport | null>(null)
  const [draftRows, setDraftRows] = useState<string[][]>([])
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [ocrText, setOcrText] = useState("")
  const [ocrBusy, setOcrBusy] = useState(false)

  const validation = useMemo<ValidatedImport | null>(() => {
    if (mode === "file") return fileValidation
    return validateTable({
      format: "csv",
      headers: [...TEMPLATE_HEADERS],
      rows: draftRows,
      rowNumbers: draftRows.map((_, index) => index + 2),
      headerRow: 1,
    })
  }, [mode, fileValidation, draftRows])

  if (!open) return null

  const pickFile = async (selected: File) => {
    setError("")
    setBusy(true)
    try {
      const parsed = await parseImportFile(selected)
      setFile(selected)
      setFileValidation(validateTable(parsed))
      setStep("preview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "product-import-template.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const runImport = async () => {
    if (!validation) return
    setBusy(true)
    setError("")
    try {
      const summary = await applyImport(validation.rows, options)
      setResult(summary)
      setStep("done")
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.")
    } finally {
      setBusy(false)
    }
  }

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setDraftRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? value : cell)) : row,
      ),
    )
  }

  const removeDraftRow = (rowIndex: number) => {
    setDraftRows((current) => current.filter((_, index) => index !== rowIndex))
  }

  const addScannedBarcode = (code: string) => {
    setDraftRows((current) => appendScannedBarcode(current, code))
  }

  const runOcr = async (selected: File) => {
    setOcrBusy(true)
    setError("")
    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("eng")
      const { data } = await worker.recognize(selected)
      await worker.terminate()
      setOcrText(data.text)
      setDraftRows(parseInvoiceText(data.text))
      setStep("preview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read text from that image.")
    } finally {
      setOcrBusy(false)
    }
  }

  const close = () => {
    if (!busy && !ocrBusy) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={close}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Import products</h2>
            <p className="mt-0.5 text-xs text-muted">CSV, XLSX, barcode scan, or invoice OCR</p>
          </div>
          <button onClick={close} className="btn-ghost p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        {step === "choose" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["file", "scan", "invoice"] as Mode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={cn("btn-secondary text-sm", mode === item && "border-primary text-foreground")}
                >
                  {item === "file" ? "File" : item === "scan" ? "Scan barcodes" : "Invoice OCR"}
                </button>
              ))}
            </div>

            {mode === "file" && (
              <>
                <div className="rounded-xl border border-dashed border-border bg-sidebar-hover/30 p-8 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; if (dropped) void pickFile(dropped) }}>
                  <FileSpreadsheet size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-sm font-medium text-foreground">Drop a product file here</p>
                  <p className="mt-1 text-[11px] text-muted">or choose a .csv or .xlsx file from your computer</p>
                  <label className="btn-primary mt-4 inline-flex">
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                    Choose file
                    <input type="file" accept=".csv,.xlsx,text/csv" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0]; event.target.value = ""; if (selected) void pickFile(selected) }} />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Need a starting file?</p>
                    <p className="text-[11px] text-muted">Download the template and fill in your products.</p>
                  </div>
                  <button onClick={downloadTemplate} className="btn-secondary text-xs">
                    <Download size={14} />
                    Template
                  </button>
                </div>
              </>
            )}

            {mode === "scan" && (
              <div className="space-y-4">
                <BarcodeScanner onScan={addScannedBarcode} />
                <p className="text-[11px] text-muted">
                  Each unique barcode becomes a row. Fill names and prices in the review table before importing.
                </p>
                {draftRows.length > 0 && (
                  <button onClick={() => setStep("preview")} className="btn-primary">
                    <Check size={16} />
                    Review {draftRows.length} scanned products
                  </button>
                )}
              </div>
            )}

            {mode === "invoice" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-border bg-sidebar-hover/30 p-8 text-center">
                  <FileSpreadsheet size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-sm font-medium text-foreground">Choose an invoice image</p>
                  <p className="mt-1 text-[11px] text-muted">PNG or JPG. Text is extracted with OCR; review every row before importing.</p>
                  <label className="btn-primary mt-4 inline-flex">
                    {ocrBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                    Choose image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="sr-only"
                      onChange={(event) => {
                        const selected = event.target.files?.[0]
                        event.target.value = ""
                        if (selected) void runOcr(selected)
                      }}
                    />
                  </label>
                </div>
                {ocrText && (
                  <details className="rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2 text-xs text-muted">
                    <summary className="cursor-pointer font-medium text-foreground">Extracted text</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{ocrText}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {step === "preview" && validation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2">
              <FileSpreadsheet size={16} className="text-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {mode === "file" ? file?.name : mode === "scan" ? `${draftRows.length} scanned barcodes` : "Invoice OCR result"}
              </span>
              <button onClick={() => setStep("choose")} className="btn-ghost text-xs">Change</button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2 text-sm text-foreground">
                <input type="checkbox" checked={options.updateExisting} onChange={(event) => setOptions({ ...options, updateExisting: event.target.checked })} className="h-4 w-4" />
                Update existing products
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2 text-sm text-foreground">
                <input type="checkbox" checked={options.createCategories} onChange={(event) => setOptions({ ...options, createCategories: event.target.checked })} className="h-4 w-4" />
                Create missing categories
              </label>
            </div>

            <p className="text-[11px] text-muted">
              Existing product stock is never changed by import. New products receive the file stock as opening stock.
            </p>

            <div className="rounded-lg border border-border bg-sidebar-hover/40 px-3 py-2 text-xs text-muted">
              <p>
                <span className="font-medium text-foreground">{validation.rows.length}</span> valid rows ·{" "}
                <span className="font-medium text-foreground">{validation.issues.length}</span> row issues · {validation.totalRows} data rows
              </p>
              {validation.unknownHeaders.length > 0 && <p className="mt-1">Ignored columns: {validation.unknownHeaders.join(", ")}</p>}
              {validation.missingRequired.length > 0 && <p className="mt-1 text-danger">Missing required column: {validation.missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}</p>}
            </div>

            {validation.issues.length > 0 && (
              <div className="max-h-28 overflow-y-auto rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
                {validation.issues.slice(0, 50).map((issue, index) => (
                  <p key={`${issue.row}-${issue.field}-${index}`} className="text-xs text-danger">
                    Row {issue.row}, {FIELD_LABELS[issue.field]}: {issue.message}
                  </p>
                ))}
                {validation.issues.length > 50 && <p className="mt-1 text-[11px] text-muted">…and {validation.issues.length - 50} more</p>}
              </div>
            )}

            {mode === "file" && validation.rows.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-sidebar-hover text-muted">
                    <tr>
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Barcode</th>
                      <th className="px-2 py-2">Price</th>
                      <th className="px-2 py-2">Stock</th>
                      <th className="px-2 py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.slice(0, 50).map((row, index) => (
                      <tr key={`${row.name}-${index}`} className="border-t border-border text-foreground">
                        <td className="px-2 py-2">{formatCell(row.name)}</td>
                        <td className="px-2 py-2">{formatCell(row.sku)}</td>
                        <td className="px-2 py-2">{formatCell(row.barcode)}</td>
                        <td className="px-2 py-2">{formatCell(row.price)}</td>
                        <td className="px-2 py-2">{formatCell(row.stock)}</td>
                        <td className="px-2 py-2">{formatCell(row.category)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validation.rows.length > 50 && <p className="px-2 py-2 text-[11px] text-muted">Showing first 50 of {validation.rows.length}</p>}
              </div>
            )}

            {(mode === "scan" || mode === "invoice") && draftRows.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-sidebar-hover text-muted">
                    <tr>
                      {TEMPLATE_HEADERS.map((header) => (
                        <th key={header} className="px-2 py-2">{header}</th>
                      ))}
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-border">
                        {TEMPLATE_HEADERS.map((_, columnIndex) => (
                          <td key={columnIndex} className="px-1 py-1">
                            <input
                              value={row[columnIndex] ?? ""}
                              onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                              className="input-field min-w-20 px-2 py-1 text-xs"
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={() => removeDraftRow(rowIndex)} className="btn-ghost p-1" aria-label="Remove row">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setStep("choose")} className="btn-secondary text-sm">
                <ArrowLeft size={15} />
                Back
              </button>
              <button onClick={() => void runImport()} disabled={busy || !validation || validation.rows.length === 0} className={cn("btn-primary", busy && "pointer-events-none opacity-60")}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                Import {validation?.rows.length ?? 0} products
              </button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-sidebar-hover/40 p-6 text-center">
              <Check size={28} className="mx-auto text-foreground" />
              <p className="mt-3 text-base font-bold text-foreground">Import complete</p>
              <p className="mt-1 text-sm text-muted">The product catalog has been refreshed.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xl font-bold text-foreground">{result.created}</p>
                <p className="text-xs text-muted">Created</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xl font-bold text-foreground">{result.updated}</p>
                <p className="text-xs text-muted">Updated</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xl font-bold text-foreground">{result.skipped}</p>
                <p className="text-xs text-muted">Skipped</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
