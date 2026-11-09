"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, Download, Package, ShoppingCart, ScanBarcode } from "lucide-react"
import { useProducts, useCategories } from "@/hooks/use-products"
import { getOrgId } from "@/lib/auth/org"
import { ProductCard } from "@/components/products/product-card"
import { ProductTable } from "@/components/products/product-table"
import { ProductForm } from "@/components/products/product-form"
import { ProductDetail } from "@/components/products/product-detail"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { formatCurrency, cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

export default function ProductsPage() {
  const { products, loading, addProduct, editProduct, removeProduct } = useProducts()
  const { categories } = useCategories()
  const [view, setView] = useState<"grid" | "list">("list")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")
  const [sort, setSort] = useState("created_at")
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanningError, setScanningError] = useState("")
  const [viewing, setViewing] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? "").includes(search)
    const matchCat = !categoryFilter || p.category_id === categoryFilter
    const matchStock =
      !stockFilter ||
      (stockFilter === "low" && p.stock > 0 && p.stock <= 10) ||
      (stockFilter === "out" && p.stock === 0) ||
      (stockFilter === "in" && p.stock > 10)
    return matchSearch && matchCat && matchStock
  })

  // Stats
  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.stock > 0).length
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 10).length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  useEffect(() => {
    const t = setTimeout(() => {
      const stock = new URLSearchParams(window.location.search).get("stock")
      if (stock === "low" || stock === "out" || stock === "in") {
        setStockFilter(stock)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const handleSave = useCallback(
    async (data: Partial<Product>) => {
      if (editing) {
        await editProduct(editing.id, data)
      } else {
        await addProduct(data)
      }
      setShowForm(false)
      setEditing(null)
    },
    [editing, addProduct, editProduct]
  )

  const handleView = useCallback((product: Product) => {
    setViewing(product)
  }, [])

  const handleEdit = useCallback((product: Product) => {
    setViewing(null)
    setEditing(product)
    setShowForm(true)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirm("Delete this product?")) {
        setViewing(null)
        await removeProduct(id)
      }
    },
    [removeProduct]
  )

  const handleScan = useCallback(
    (barcode: string) => {
      const product = products.find((p) => p.barcode === barcode)
      if (product) {
        setViewing(product)
      } else {
        setScanningError(`No product has barcode ${barcode}`)
      }
    },
    [products]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{totalProducts} products in inventory</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Total Products</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{totalProducts}</p>
            <p className="mt-1 text-xs text-muted">All products</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Active Products</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{activeProducts}</p>
            <p className="mt-1 text-xs text-muted">{totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0}% active rate</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Low Stock</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{lowStockProducts}</p>
            <p className="mt-1 text-xs text-muted">Need restocking</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Total Value</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            <p className="mt-1 text-xs text-muted">Inventory value</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
      </div>

      {/* Product Catalog */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">Product Catalog</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <button
            onClick={() => { setScanningError(""); setShowScanner(true) }}
            className="btn-secondary shrink-0"
            title="Scan a barcode to find a product"
          >
            <ScanBarcode size={16} />
            Scan
          </button>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field w-auto min-w-[120px]"
          >
            <option value="created_at">Newest</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </select>

          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "rounded-md p-1.5 transition-all",
                view === "grid" ? "bg-primary text-white" : "text-muted hover:text-foreground"
              )}
            >
              <Package size={18} />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-md p-1.5 transition-all",
                view === "list" ? "bg-primary text-white" : "text-muted hover:text-foreground"
              )}
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onView={handleView} />
              ))}
            </div>
          ) : (
            <ProductTable
              products={filtered}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {viewing && (
        <ProductDetail
          product={products.find((p) => p.id === viewing.id) ?? viewing}
          onClose={() => setViewing(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Scan Barcode</h2>
              <button onClick={() => setShowScanner(false)} className="btn-ghost p-1">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>
            {scanningError && <p className="mb-3 text-sm text-danger">{scanningError}</p>}
            <BarcodeScanner
              onScan={(barcode) => {
                handleScan(barcode)
                setShowScanner(false)
              }}
              onError={(err) => setScanningError(err)}
            />
          </div>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          orgId={getOrgId()}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
