"use client"

import { useState, useCallback } from "react"
import { findProductByBarcode, fetchProduct, adjustStock } from "@/lib/api/data"
import type { Product, ScanSessionItem } from "@/lib/types"

interface ScanResult {
  product: Product | null
  barcode: string
}

export function useBarcodeScan() {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scanBarcode = useCallback(async (barcode: string): Promise<ScanResult> => {
    setError(null)
    const trimmed = barcode.trim()
    if (!trimmed) {
      setError("No barcode data")
      return { product: null, barcode: trimmed }
    }

    try {
      const product = await findProductByBarcode(trimmed)
      const result: ScanResult = { product, barcode: trimmed }
      setLastResult(result)
      if (!product) {
        setError(`Product not found for barcode: ${trimmed}`)
      }
      return result
    } catch (err) {
      const result: ScanResult = { product: null, barcode: trimmed }
      setLastResult(result)
      setError(err instanceof Error ? err.message : `Product not found for barcode: ${trimmed}`)
      return result
    }
  }, [])

  const incrementStock = useCallback(async (
    productId: string,
    quantity: number = 1
  ): Promise<ScanSessionItem | null> => {
    const product = await fetchProduct(productId)
    if (!product) return null

    const previousStock = product.stock
    const newStock = previousStock + quantity

    await adjustStock(productId, quantity, "receive")

    return {
      product_id: productId,
      product_name: product.name,
      barcode: product.barcode || "",
      previous_stock: previousStock,
      new_stock: newStock,
      quantity_added: quantity,
      scanned_at: new Date().toISOString(),
    }
  }, [])

  const clearResult = useCallback(() => {
    setLastResult(null)
    setError(null)
  }, [])

  return {
    scanning,
    setScanning,
    lastResult,
    error,
    scanBarcode,
    incrementStock,
    clearResult,
  }
}
