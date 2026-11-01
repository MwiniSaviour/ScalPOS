"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product, ScanSessionItem } from "@/lib/types"

interface ScanResult {
  product: Product | null
  barcode: string
}

export function useBarcodeScan() {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const scanBarcode = useCallback(async (barcode: string): Promise<ScanResult> => {
    setError(null)
    const trimmed = barcode.trim()
    if (!trimmed) {
      setError("No barcode data")
      return { product: null, barcode: trimmed }
    }

    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("barcode", trimmed)
      .maybeSingle()

    const result: ScanResult = {
      product: data as unknown as Product | null,
      barcode: trimmed,
    }
    setLastResult(result)
    if (!data) {
      setError(`Product not found for barcode: ${trimmed}`)
    }
    return result
  }, [supabase])

  const incrementStock = useCallback(async (
    productId: string,
    quantity: number = 1
  ): Promise<ScanSessionItem | null> => {
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()

    if (!product) return null

    const previousStock = product.stock
    const newStock = previousStock + quantity

    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId)

    return {
      product_id: productId,
      product_name: product.name,
      barcode: product.barcode || "",
      previous_stock: previousStock,
      new_stock: newStock,
      quantity_added: quantity,
      scanned_at: new Date().toISOString(),
    }
  }, [supabase])

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
