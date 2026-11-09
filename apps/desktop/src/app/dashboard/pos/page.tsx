"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Printer,
  X,
  Package,
  CreditCard,
  Banknote,
  Building2,
  Scan,
  Camera,
  Barcode,
} from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { PAYMENT_METHODS } from "@/lib/constants"
import {
  fetchProducts,
  fetchCategories,
  fetchCustomers,
  fetchSettings,
  createCustomer,
  placeSale,
} from "@/lib/api/data"
import type { Product, Customer, CartItem, Category, Sale, ShopSettings } from "@/lib/types"
import { useImageSrc } from "@/lib/api/image"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { OrderReceipt } from "@/components/orders/receipt"
import { useRealtime } from "@/lib/api/realtime"

function PosImage({
  image,
  alt,
  iconSize,
}: {
  image: string | null
  alt: string
  iconSize: number
}) {
  const src = useImageSrc(image)
  return src ? (
    <img src={src} alt={alt} className="h-full w-full rounded-lg object-cover" />
  ) : (
    <Package size={iconSize} className="text-muted" />
  )
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerSelect, setShowCustomerSelect] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [posSettings, setPosSettings] = useState<ShopSettings | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [productLookupError, setProductLookupError] = useState<string | null>(null)
  const hwBufferRef = useRef("")
  const hwTimerRef = useRef<NodeJS.Timeout | null>(null)

  const load = useCallback(async () => {
    try {
      const [productsData, categoriesData, customersData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchCustomers(),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setCustomers(customersData)
      setError(null)
    } catch {
      setError("Failed to load POS data. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t0 = setTimeout(() => {
      void fetchSettings().then(setPosSettings).catch(() => {})
    }, 0)
    return () => clearTimeout(t0)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setScanMessage(null)
      setProductLookupError(null)
      const trimmed = barcode.trim()
      if (!trimmed) return

      const product = products.find(
        (p) => p.barcode?.toLowerCase() === trimmed.toLowerCase()
      )
      if (product) {
        addToCart(product)
        setScanMessage(`Added: ${product.name}`)
      } else {
        setProductLookupError(`Product not found for barcode: ${trimmed}`)
      }
    },
    [products]
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && hwBufferRef.current.length > 3) {
        handleBarcodeScan(hwBufferRef.current)
        hwBufferRef.current = ""
        if (hwTimerRef.current) clearTimeout(hwTimerRef.current)
        return
      }
      if (e.key.length === 1) {
        hwBufferRef.current += e.key
        if (hwTimerRef.current) clearTimeout(hwTimerRef.current)
        hwTimerRef.current = setTimeout(() => {
          hwBufferRef.current = ""
        }, 100)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleBarcodeScan])

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode && p.barcode.includes(search))
        const matchCat = !catFilter || p.category_id === catFilter
        return matchSearch && matchCat
      }),
    [products, search, catFilter]
  )

  const cartQtyById = useMemo(
    () => Object.fromEntries(cart.map((i) => [i.product_id, i.quantity])),
    [cart]
  )

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          image: product.image,
          unit_price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          if (newQty > item.stock) return item
          return { ...item, quantity: newQty }
        })
        .filter(Boolean) as CartItem[]
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId))
  }

  const { subtotal, discountAmount, total } = useMemo(() => {
    const sub = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const disc = sub * (discount / 100)
    return {
      subtotal: sub,
      discountAmount: disc,
      total: sub - disc,
    }
  }, [cart, discount])

  async function checkout() {
    if (cart.length === 0 || sending) return
    setSending(true)
    try {
      const payments =
        paymentMethod === "credit"
          ? []
          : [{ method: paymentMethod, amount: total }]
      const sale = await placeSale({
        customer_id: selectedCustomer?.id ?? null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          name: item.product_name,
          image_path: item.image,
          qty: item.quantity,
          price: item.unit_price,
        })),
        payments,
        subtotal,
        discount: discountAmount,
        tax: 0,
        total,
      })
      setLastSale(sale)
      setShowReceipt(true)
      setCart([])
      setDiscount(0)
      setSelectedCustomer(null)
      setError(null)
      const fresh = await fetchProducts()
      setProducts(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete sale.")
    } finally {
      setSending(false)
    }
  }

  async function createCustomerQuick() {
    if (!customerSearch.trim()) return
    try {
      const created = await createCustomer({ name: customerSearch.trim() })
      setCustomers((prev) => [...prev, created])
      setSelectedCustomer(created)
      setShowCustomerSelect(false)
      setCustomerSearch("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-8">
      <div className="flex flex-1 flex-col border-r border-border">
        <div className="border-b border-border bg-card p-4">
          {error && (
            <div className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger flex items-center gap-2">
              <X size={14} />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={12} />
              </button>
            </div>
          )}
          {scanMessage && (
            <div className="mb-2 rounded-lg bg-success-bg px-3 py-2 text-xs text-success flex items-center gap-2">
              <Barcode size={14} />
              {scanMessage}
            </div>
          )}
          {productLookupError && (
            <div className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger flex items-center gap-2">
              <Barcode size={14} />
              {productLookupError}
              <button onClick={() => setProductLookupError(null)} className="ml-auto">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="relative mb-3 flex gap-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field flex-1 pl-9"
              autoFocus
            />
            <button
              onClick={() => setShowScanner(true)}
              className="btn-secondary shrink-0"
              title="Scan barcode"
            >
              <Scan size={16} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCatFilter("")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                !catFilter
                  ? "bg-primary text-white"
                  : "bg-sidebar-hover text-muted hover:text-foreground"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCatFilter(cat.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  catFilter === cat.id
                    ? "bg-primary text-white"
                    : "bg-sidebar-hover text-muted hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const inCart = cartQtyById[product.id] ?? 0
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0 || !product.active}
                  className={cn(
                    "relative flex flex-col items-center rounded-xl border bg-card p-3 text-center transition-all hover:shadow-md active:scale-95",
                    inCart > 0
                      ? "border-primary bg-primary-light ring-2 ring-primary/20"
                      : "border-border hover:border-primary",
                    (product.stock === 0 || !product.active) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {inCart > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-sm">
                      {inCart}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "mb-2 flex h-16 w-16 items-center justify-center rounded-lg",
                      inCart > 0 ? "bg-primary/10" : "bg-sidebar-hover"
                    )}
                  >
                    <PosImage image={product.image} alt={product.name} iconSize={24} />
                  </div>
                  <p className="w-full truncate text-xs font-medium text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-primary">
                    {formatCurrency(product.price)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex w-96 flex-col bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-base font-bold text-foreground">Current Sale</h2>
          <p className="text-xs text-muted">{cart.length} items in cart</p>
        </div>

        <div className="relative border-b border-border p-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg bg-primary-light px-3 py-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary" />
                <span className="text-sm font-medium text-primary">{selectedCustomer.name}</span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-primary hover:opacity-70"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                className="btn-secondary w-full text-xs"
              >
                <User size={14} />
                Select Customer
              </button>
              {showCustomerSelect && (
                <div className="absolute left-4 right-4 top-full z-10 mt-1 rounded-xl border border-border bg-card p-3 shadow-xl">
                  <input
                    placeholder="Search or create customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="input-field mb-2 text-xs"
                    autoFocus
                  />
                  <div className="max-h-32 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c)
                          setShowCustomerSelect(false)
                          setCustomerSearch("")
                        }}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-sidebar-hover transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                    {customerSearch.trim() && filteredCustomers.length === 0 && (
                      <button
                        onClick={createCustomerQuick}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs text-primary hover:bg-sidebar-hover"
                      >
                        + Create &quot;{customerSearch.trim()}&quot;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <Package size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs">Click products to add them</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-hover">
                  <PosImage image={item.image} alt={item.product_name} iconSize={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatCurrency(item.unit_price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product_id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-sidebar-hover transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id, 1)}
                    disabled={item.quantity >= item.stock}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-sidebar-hover transition-colors disabled:opacity-30"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <p className="w-16 text-right text-sm font-semibold text-foreground">
                  {formatCurrency(item.unit_price * item.quantity)}
                </p>
                <button
                  onClick={() => removeFromCart(item.product_id)}
                  className="text-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Discount (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-16 rounded border border-border px-2 py-0.5 text-right text-sm text-foreground"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-base font-bold text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>

          <div className="flex gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.value === "cash" ? Banknote : pm.value === "card" ? CreditCard : Building2
              return (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-all",
                    paymentMethod === pm.value
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-muted hover:border-primary hover:text-foreground"
                  )}
                >
                  <Icon size={15} />
                  {pm.label}
                </button>
              )
            })}
          </div>

          {paymentMethod === "credit" && (
            <p className="text-xs text-muted">
              Credit sale will be saved as unpaid.
            </p>
          )}

          <button
            onClick={checkout}
            disabled={cart.length === 0 || sending}
            className="btn-primary w-full py-3 text-sm"
          >
            <CreditCard size={18} />
            {sending
              ? "Saving..."
              : creditLabel(paymentMethod) +
                " " +
                formatCurrency(total)}
          </button>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">Scan Barcode</h2>
              </div>
              <button onClick={() => setShowScanner(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <BarcodeScanner
              onScan={(barcode) => {
                handleBarcodeScan(barcode)
                setShowScanner(false)
              }}
              onError={(err) => setProductLookupError(err)}
            />
          </div>
        </div>
      )}

      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                <Package size={24} className="text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Sale Complete</h2>
              <p className="text-xs text-muted">{lastSale.invoice_no}</p>
            </div>

            <OrderReceipt sale={lastSale} settings={posSettings} className="rounded-xl border border-border" />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => window.print()}
                className="btn-secondary flex-1"
              >
                <Printer size={16} />
                Print Receipt
              </button>
              <button
                onClick={() => { setShowReceipt(false); setLastSale(null) }}
                className="btn-primary flex-1"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function creditLabel(method: string): string {
  if (method === "credit") return "Credit — unpaid sale"
  return PAYMENT_METHODS.find((p) => p.value === method)?.label ?? method
}
