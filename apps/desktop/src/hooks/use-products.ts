"use client"

import { useState, useEffect, useCallback } from "react"
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api/data"
import type { ProductInput, CategoryInput } from "@/lib/api/data"
import type { Product, Category } from "@/lib/types"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addProduct(input: Partial<ProductInput>) {
    const created = await createProduct(input as ProductInput)
    setProducts((prev) => [created, ...prev])
    return created
  }

  async function editProduct(id: string, input: Partial<ProductInput>) {
    const updated = await updateProduct(id, input)
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  async function removeProduct(id: string) {
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  async function changeStock(id: string, delta: number, reason: string, ref?: string) {
    await adjustStock(id, delta, reason, ref)
    await load()
  }

  return { products, loading, error, reload: load, addProduct, editProduct, removeProduct, changeStock }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addCategory(input: Partial<CategoryInput>) {
    const created = await createCategory(input as CategoryInput)
    setCategories((prev) => [...prev, created])
    return created
  }

  async function editCategory(id: string, input: Partial<CategoryInput>) {
    const updated = await updateCategory(id, input)
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function removeCategory(id: string) {
    await deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return { categories, loading, error, reload: load, addCategory, editCategory, removeCategory }
}
