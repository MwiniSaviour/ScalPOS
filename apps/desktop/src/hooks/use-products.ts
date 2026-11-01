"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product, Category } from "@/lib/types"

interface ProductFilters {
  search: string
  category_id: string | null
  stock_status: string | null
  sort: string
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProducts = useCallback(async (filters?: Partial<ProductFilters>) => {
    setLoading(true)
    let query = supabase
      .from("products")
      .select("*, category:categories(*)")

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }
    if (filters?.category_id) {
      query = query.eq("category_id", filters.category_id)
    }
    if (filters?.stock_status === "low") {
      query = query.lte("stock", 10).gt("stock", 0)
    }
    if (filters?.stock_status === "out") {
      query = query.eq("stock", 0)
    }
    if (filters?.stock_status === "in") {
      query = query.gt("stock", 10)
    }

    const sortField = filters?.sort || "created_at"
    query = query.order(sortField, { ascending: sortField === "name" })

    const { data } = await query
    if (data) setProducts(data as unknown as Product[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  async function createProduct(product: Partial<Product>) {
    const { data } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single()
    if (data) {
      setProducts((prev) => [data as unknown as Product, ...prev])
    }
    return data
  }

  async function updateProduct(id: string, product: Partial<Product>) {
    const { data } = await supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select()
      .single()
    if (data) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? (data as unknown as Product) : p))
      )
    }
    return data
  }

  async function deleteProduct(id: string) {
    await supabase.from("products").delete().eq("id", id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  return { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name")
    if (data) setCategories(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  async function createCategory(category: Partial<Category>) {
    const { data } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single()
    if (data) {
      setCategories((prev) => [...prev, data])
    }
    return data
  }

  async function updateCategory(id: string, category: Partial<Category>) {
    const { data } = await supabase
      .from("categories")
      .update(category)
      .eq("id", id)
      .select()
      .single()
    if (data) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? data : c))
      )
    }
    return data
  }

  async function deleteCategory(id: string) {
    await supabase.from("categories").delete().eq("id", id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return { categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory }
}
