"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileSpreadsheet, ScanLine, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ContinuousScanOverlay from "@/components/scanner/continuous-scan-overlay";
import { usePos } from "@/lib/store";
import { FIELD_LABELS, TEMPLATE_CSV, TEMPLATE_HEADERS } from "@/lib/import/columns";
import { parseImportFile } from "@/lib/import/parse";
import { validateTable, type ImportOptions, type ImportResult, type ValidatedImport } from "@/lib/import/validate";
import { appendScannedBarcode } from "@/lib/import/scan";
import { parseInvoiceText } from "@/lib/import/invoice";

type Mode = "file" | "scan" | "invoice";
type Step = "choose" | "preview" | "done";

const OPTIONS: ImportOptions = { updateExisting: true, createCategories: true };

export function ProductImportSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("file");
  const [step, setStep] = useState<Step>("choose");
  const [scanning, setScanning] = useState(false);
  const [fileValidation, setFileValidation] = useState<ValidatedImport | null>(null);
  const [draftRows, setDraftRows] = useState<string[][]>([]);
  const [options, setOptions] = useState<ImportOptions>(OPTIONS);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ocrText, setOcrText] = useState("");

  const validation = useMemo<ValidatedImport | null>(() => {
    if (mode === "file") return fileValidation;
    return validateTable({
      format: "csv",
      headers: [...TEMPLATE_HEADERS],
      rows: draftRows,
      rowNumbers: draftRows.map((_, index) => index + 2),
      headerRow: 1,
    });
  }, [mode, fileValidation, draftRows]);

  const close = () => {
    if (busy) return;
    onClose();
    setMode("file");
    setStep("choose");
    setScanning(false);
    setFileValidation(null);
    setDraftRows([]);
    setOptions(OPTIONS);
    setResult(null);
    setError("");
    setOcrText("");
  };

  const pickFile = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const table = await parseImportFile(file);
      setFileValidation(validateTable(table));
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  };

  const runOcr = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setOcrText(data.text);
      setDraftRows(parseInvoiceText(data.text));
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read text from that image.");
    } finally {
      setBusy(false);
    }
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setDraftRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? value : cell)) : row,
      ),
    );
  };

  const runImport = () => {
    if (!validation || validation.rows.length === 0) return;
    setBusy(true);
    setError("");
    try {
      setResult(usePos.getState().importProducts(validation.rows, options));
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const scanEntries = draftRows.map((row, index) => ({
    code: row[2] ?? "",
    label: row[0] || `Product ${index + 1}`,
    status: "added" as const,
    at: index + 1,
  }));

  return (
    <>
      <Sheet
        open={open}
        onClose={close}
        title="Import products"
        height="full"
        footer={
          step === "preview" ? (
            <Button block onClick={runImport} loading={busy} disabled={!validation || validation.rows.length === 0}>
              Import {validation?.rows.length ?? 0} products
            </Button>
          ) : step === "done" ? (
            <Button block onClick={close}>Done</Button>
          ) : null
        }
      >
        {error && <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

        {step === "choose" && (
          <div className="space-y-4 pb-8">
            <div className="flex gap-1.5">
              {(["file", "scan", "invoice"] as Mode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`press flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold ${
                    mode === item ? "bg-accent text-accentink" : "bg-surface2 text-ink2"
                  }`}
                >
                  {item === "file" ? "File" : item === "scan" ? "Scan" : "Invoice"}
                </button>
              ))}
            </div>

            {mode === "file" && (
              <div className="rounded-2xl border border-line2 bg-surface p-5 text-center">
                <FileSpreadsheet className="mx-auto size-8 text-ink3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Import a product file</p>
                <p className="mt-1 text-[13px] text-ink3">CSV or XLSX files work offline.</p>
                <label className="press mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-[15px] font-semibold text-accentink">
                  Choose file
                  <input
                    type="file"
                    accept=".csv,.xlsx,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void pickFile(file);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "product-import-template.csv";
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="press mx-auto mt-3 flex items-center gap-1.5 text-[13px] font-medium text-accent"
                >
                  <Download className="size-4" />
                  Download template
                </button>
              </div>
            )}

            {mode === "scan" && (
              <div className="rounded-2xl border border-line2 bg-surface p-5 text-center">
                <ScanLine className="mx-auto size-8 text-ink3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Scan barcodes</p>
                <p className="mt-1 text-[13px] text-ink3">
                  The camera stays on. Scan every product, then review the list.
                </p>
                <Button className="mt-4" onClick={() => setScanning(true)}>
                  Start scanning
                </Button>
                {draftRows.length > 0 && (
                  <p className="mt-3 text-[13px] text-ink2">{draftRows.length} barcode(s) collected</p>
                )}
              </div>
            )}

            {mode === "invoice" && (
              <div className="rounded-2xl border border-line2 bg-surface p-5 text-center">
                <FileSpreadsheet className="mx-auto size-8 text-ink3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Read an invoice image</p>
                <p className="mt-1 text-[13px] text-ink3">
                  OCR extracts item names and numbers. Review every row before importing.
                </p>
                <label className="press mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-[15px] font-semibold text-accentink">
                  Choose image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void runOcr(file);
                    }}
                  />
                </label>
                {ocrText && (
                  <details className="mt-4 text-left text-[12px] text-ink3">
                    <summary className="cursor-pointer font-medium text-ink">Extracted text</summary>
                    <pre className="no-scrollbar mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{ocrText}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {step === "preview" && validation && (
          <div className="space-y-4 pb-8">
            <div className="rounded-xl bg-surface2 px-3 py-2 text-[13px] text-ink2">
              {validation.rows.length} valid · {validation.issues.length} issues · {validation.totalRows} rows
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink">
                <input
                  type="checkbox"
                  checked={options.updateExisting}
                  onChange={(event) => setOptions({ ...options, updateExisting: event.target.checked })}
                />
                Update existing products
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink">
                <input
                  type="checkbox"
                  checked={options.createCategories}
                  onChange={(event) => setOptions({ ...options, createCategories: event.target.checked })}
                />
                Create missing categories
              </label>
            </div>
            <p className="text-[12px] text-ink3">Existing stock is never changed. New products use the file stock as opening stock.</p>

            {validation.issues.length > 0 && (
              <div className="max-h-28 overflow-auto rounded-xl bg-danger/10 px-3 py-2 text-[12px] text-danger">
                {validation.issues.slice(0, 50).map((issue, index) => (
                  <p key={`${issue.row}-${issue.field}-${index}`}>
                    Row {issue.row}, {FIELD_LABELS[issue.field]}: {issue.message}
                  </p>
                ))}
              </div>
            )}

            {mode === "file" ? (
              <div className="no-scrollbar overflow-x-auto rounded-xl border border-line2">
                <table className="w-full border-collapse text-[12px]">
                  <thead className="bg-surface2 text-ink3">
                    <tr>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Barcode</th>
                      <th className="px-2 py-2 text-left">Price</th>
                      <th className="px-2 py-2 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.slice(0, 50).map((row, index) => (
                      <tr key={`${row.name}-${index}`} className="border-t border-line2 text-ink">
                        <td className="px-2 py-2">{row.name}</td>
                        <td className="px-2 py-2">{row.barcode}</td>
                        <td className="px-2 py-2">{row.price}</td>
                        <td className="px-2 py-2">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-scrollbar overflow-x-auto rounded-xl border border-line2">
                <table className="border-collapse text-[12px]">
                  <thead className="bg-surface2 text-ink3">
                    <tr>
                      {TEMPLATE_HEADERS.map((header) => (
                        <th key={header} className="px-2 py-2 text-left">{header}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-line2">
                        {TEMPLATE_HEADERS.map((_, columnIndex) => (
                          <td key={columnIndex} className="p-1">
                            <input
                              value={row[columnIndex] ?? ""}
                              onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                              className="w-24 rounded-lg border border-line2 bg-bg px-2 py-1.5 text-ink"
                            />
                          </td>
                        ))}
                        <td className="p-1">
                          <button
                            onClick={() => setDraftRows((current) => current.filter((_, index) => index !== rowIndex))}
                            className="press rounded-lg p-1.5 text-ink3"
                            aria-label="Remove row"
                          >
                            <X className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 pb-8 text-center">
            <Check className="mx-auto size-9 text-accent" />
            <p className="text-[17px] font-bold text-ink">Import complete</p>
            <div className="grid grid-cols-3 gap-2">
              {[["Created", result.created], ["Updated", result.updated], ["Skipped", result.skipped]].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-surface px-2 py-3">
                  <p className="text-[18px] font-bold text-ink">{String(value)}</p>
                  <p className="text-[12px] text-ink3">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>

      {scanning && (
        <ContinuousScanOverlay
          entries={scanEntries}
          onCode={(code) => setDraftRows((current) => appendScannedBarcode(current, code))}
          onClose={() => {
            setScanning(false);
            setStep(draftRows.length > 0 ? "preview" : "choose");
          }}
        />
      )}
    </>
  );
}
