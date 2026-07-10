"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, generateInvoiceNo, cn } from "@/lib/utils"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { Product, Customer, CartItem, Profile, Category } from "@/lib/types"

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
  const [lastSale, setLastSale] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [discount, setDiscount] = useState(0)
  const [employee, setEmployee] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (prof) setEmployee(prof)
      }

      const [pRes, cRes, cuRes] = await Promise.all([
        supabase.from("products").select("*, category:categories(*)").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("customers").select("*").order("name"),
      ])
      if (pRes.data) setProducts(pRes.data as unknown as Product[])
      if (cRes.data) setCategories(cRes.data)
      if (cuRes.data) setCustomers(cuRes.data)
      setLoading(false)
    }
    load()
  }, [supabase])

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

  const { subtotal, tax, taxAmount, total } = useMemo(() => {
    const sub = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const disc = sub * (discount / 100)
    const taxable = sub - disc
    const t = 0
    return {
      subtotal: sub,
      tax: t,
      taxAmount: taxable * (t / 100),
      total: taxable + taxable * (t / 100),
    }
  }, [cart, discount])

  async function checkout() {
    if (cart.length === 0) return

    const invoiceNo = generateInvoiceNo()

    const saleData = {
      invoice_no: invoiceNo,
      customer_id: selectedCustomer?.id || null,
      employee_id: employee?.id || null,
      subtotal,
      tax: taxAmount,
      discount: subtotal * (discount / 100),
      total,
      payment_method: paymentMethod,
      payment_status: "paid",
      sale_date: new Date().toISOString().split("T")[0],
    }

    const { data: sale } = await supabase
      .from("sales")
      .insert(saleData)
      .select()
      .single()

    if (!sale) return

    const itemsData = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }))

    await supabase.from("sale_items").insert(itemsData)

    for (const item of cart) {
      await supabase
        .from("products")
        .update({ stock: item.stock - item.quantity })
        .eq("id", item.product_id)
    }

    if (selectedCustomer) {
      await supabase
        .from("customers")
        .update({ total_purchases: selectedCustomer.total_purchases + total })
        .eq("id", selectedCustomer.id)
    }

    setLastSale({ ...sale, items: itemsData, customer: selectedCustomer })
    setShowReceipt(true)
    setCart([])
    setDiscount(0)
    setSelectedCustomer(null)
  }

  async function createCustomerQuick() {
    if (!customerSearch.trim()) return
    const { data } = await supabase
      .from("customers")
      .insert({ name: customerSearch.trim() })
      .select()
      .single()
    if (data) {
      setCustomers((prev) => [...prev, data])
      setSelectedCustomer(data)
      setShowCustomerSelect(false)
      setCustomerSearch("")
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
      {/* Left: Products */}
      <div className="flex flex-1 flex-col border-r border-border">
        <div className="border-b border-border bg-card p-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
              autoFocus
            />
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
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
                className={cn(
                  "flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center transition-all hover:border-primary hover:shadow-md active:scale-95",
                  product.stock === 0 && "opacity-40 cursor-not-allowed"
                )}
              >
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-sidebar-hover">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-muted" />
                  )}
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
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="flex w-96 flex-col bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-base font-bold text-foreground">Current Sale</h2>
          <p className="text-xs text-muted">{cart.length} items in cart</p>
        </div>

        {/* Customer selection */}
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

        {/* Cart items */}
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
                  {item.image ? (
                    <img src={item.image} alt={item.product_name} className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <Package size={18} className="text-muted" />
                  )}
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

        {/* Totals */}
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

          {/* Payment methods */}
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

          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="btn-primary w-full py-3 text-sm"
          >
            <CreditCard size={18} />
            Complete Sale — {formatCurrency(total)}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                <Package size={24} className="text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Sale Complete</h2>
              <p className="text-xs text-muted">{lastSale.invoice_no}</p>
            </div>

            <div className="mb-4 space-y-2 rounded-lg bg-sidebar-hover p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Date</span>
                <span className="text-foreground">{new Date().toLocaleDateString()}</span>
              </div>
              {lastSale.customer && (
                <div className="flex justify-between">
                  <span className="text-muted">Customer</span>
                  <span className="text-foreground">{lastSale.customer.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Payment</span>
                <span className="badge-info">{PAYMENT_METHODS.find(p => p.value === lastSale.payment_method)?.label}</span>
              </div>
              <div className="border-t border-border pt-2">
                {lastSale.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-foreground">
                      {item.product_name} x{item.quantity}
                    </span>
                    <span className="text-foreground">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">{formatCurrency(lastSale.total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
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
