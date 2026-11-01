import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Seed categories
  const categories = [
    { name: "Beverages", description: "Drinks and refreshments" },
    { name: "Snacks", description: "Chips, nuts, and quick bites" },
    { name: "Dairy", description: "Milk, cheese, yogurt, and eggs" },
    { name: "Bakery", description: "Bread, pastries, and cakes" },
    { name: "Household", description: "Cleaning supplies and essentials" },
    { name: "Personal Care", description: "Soap, shampoo, and hygiene" },
  ]

  const { data: catData } = await supabase
    .from("categories")
    .insert(categories)
    .select()
  if (!catData) return NextResponse.json({ error: "Failed to seed categories" }, { status: 500 })

  // Seed products
  const products = [
    { name: "Spring Water 500ml", sku: "BEV-001", price: 1.00, cost_price: 0.50, stock: 200, category_id: catData[0].id },
    { name: "Cola 330ml", sku: "BEV-002", price: 1.50, cost_price: 0.80, stock: 150, category_id: catData[0].id },
    { name: "Orange Juice 1L", sku: "BEV-003", price: 3.00, cost_price: 1.80, stock: 80, category_id: catData[0].id },
    { name: "Green Tea 20 bags", sku: "BEV-004", price: 2.50, cost_price: 1.40, stock: 60, category_id: catData[0].id },
    { name: "Potato Chips 150g", sku: "SNK-001", price: 2.00, cost_price: 1.10, stock: 120, category_id: catData[1].id },
    { name: "Chocolate Bar", sku: "SNK-002", price: 1.75, cost_price: 0.90, stock: 90, category_id: catData[1].id },
    { name: "Mixed Nuts 200g", sku: "SNK-003", price: 4.50, cost_price: 2.80, stock: 45, category_id: catData[1].id },
    { name: "Whole Milk 1L", sku: "DRY-001", price: 2.20, cost_price: 1.30, stock: 40, category_id: catData[2].id },
    { name: "Cheddar Cheese 200g", sku: "DRY-002", price: 3.80, cost_price: 2.40, stock: 30, category_id: catData[2].id },
    { name: "Greek Yogurt 500g", sku: "DRY-003", price: 3.00, cost_price: 1.90, stock: 25, category_id: catData[2].id },
    { name: "White Bread Loaf", sku: "BAK-001", price: 2.00, cost_price: 1.00, stock: 35, category_id: catData[3].id },
    { name: "Croissant 4-pack", sku: "BAK-002", price: 3.50, cost_price: 2.00, stock: 20, category_id: catData[3].id },
    { name: "Chocolate Muffin", sku: "BAK-003", price: 2.50, cost_price: 1.30, stock: 15, category_id: catData[3].id },
    { name: "All-Purpose Cleaner", sku: "HHD-001", price: 4.00, cost_price: 2.20, stock: 50, category_id: catData[4].id },
    { name: "Paper Towels 6-roll", sku: "HHD-002", price: 5.50, cost_price: 3.50, stock: 40, category_id: catData[4].id },
    { name: "Hand Soap 500ml", sku: "PCR-001", price: 3.25, cost_price: 1.80, stock: 70, category_id: catData[5].id },
    { name: "Shampoo 400ml", sku: "PCR-002", price: 5.00, cost_price: 3.00, stock: 45, category_id: catData[5].id },
    { name: "Toothpaste 100ml", sku: "PCR-003", price: 3.50, cost_price: 2.00, stock: 65, category_id: catData[5].id },
    { name: "Low Stock Item", sku: "LST-001", price: 2.00, cost_price: 1.00, stock: 3, category_id: catData[1].id },
    { name: "Out of Stock Item", sku: "OST-001", price: 1.50, cost_price: 0.75, stock: 0, category_id: catData[1].id },
  ]

  const { data: prodData } = await supabase.from("products").insert(products).select()
  if (!prodData) return NextResponse.json({ error: "Failed to seed products" }, { status: 500 })

  // Seed customers
  const customers = [
    { name: "John Doe", email: "john@example.com", phone: "+1-555-0101", address: "123 Main St, Springfield, IL" },
    { name: "Jane Smith", email: "jane@example.com", phone: "+1-555-0102", address: "456 Oak Ave, Portland, OR" },
    { name: "Bob Wilson", email: "bob@example.com", phone: "+1-555-0103", address: "789 Pine Rd, Austin, TX" },
    { name: "Alice Brown", email: "alice@example.com", phone: "+1-555-0104", address: "321 Elm St, Denver, CO" },
    { name: "Charlie Davis", email: "charlie@example.com", phone: "+1-555-0105", address: "654 Maple Dr, Seattle, WA" },
  ]

  const { data: custData } = await supabase.from("customers").insert(customers).select()
  if (!custData) return NextResponse.json({ error: "Failed to seed customers" }, { status: 500 })

  // Seed suppliers
  const suppliers = [
    { name: "Fresh Foods Co.", contact_person: "Mike Johnson", email: "mike@freshfoods.com", phone: "+1-555-0201", address: "100 Industrial Blvd, Chicago, IL" },
    { name: "Beverage Distributors Inc.", contact_person: "Sarah Lee", email: "sarah@beveragedist.com", phone: "+1-555-0202", address: "200 Commerce St, Atlanta, GA" },
    { name: "Home Essentials Ltd.", contact_person: "Tom Harris", email: "tom@homeessentials.com", phone: "+1-555-0203", address: "300 Trade Center, Dallas, TX" },
  ]

  await supabase.from("suppliers").insert(suppliers)

  // Seed employees (includes the explicit test user id requested)
  const employees = [
    { name: "Admin User", email: "admin@shop.com", role: "admin", pin: "1234" },
    { name: "Employee One", email: "employee@shop.com", role: "employee", pin: "5678" },
    { name: "Employee Two", email: "staff@shop.com", role: "employee", pin: "9012" },
    { name: "Manager User", email: "manager@shop.com", role: "admin", pin: "3456" },
    { id: "06f6c4d5-ff20-40fe-a8d2-7826f9674c56", name: "Test Employee", email: "test@example.com", role: "employee", pin: "1111" },
  ]

  for (const emp of employees) {
    await supabase.from("profiles").insert({
      id: emp.id || crypto.randomUUID(),
      name: emp.name,
      email: emp.email,
      role: emp.role,
      pin: emp.pin,
      avatar: null,
      created_at: new Date().toISOString(),
    })
  }

  // Seed expenses
  const expenses = [
    { description: "Electricity Bill", amount: 150.00, category: "Utilities", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { description: "Gas Bill", amount: 80.00, category: "Utilities", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { description: "Rent", amount: 2000.00, category: "Rent", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { description: "Internet", amount: 60.00, category: "Utilities", date: new Date().toISOString().split("T")[0] },
    { description: "Office Supplies", amount: 120.50, category: "Office", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
  ]

  await supabase.from("expenses").insert(expenses)

  // Seed sales (last 30 days)
  const today = new Date()
  const salesData: any[] = []
  const paymentMethods = ["cash", "card", "transfer"] as const
  const productIds = prodData.slice(0, 10).map((p) => ({ id: p.id, name: p.name, price: p.price }))

  for (let d = 29; d >= 0; d--) {
    const numSales = Math.floor(Math.random() * 4) + 1
    for (let i = 0; i < numSales; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - d)
      date.setHours(8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60))

      const numItems = Math.floor(Math.random() * 4) + 1
      const items: any[] = []
      let subtotal = 0
      const usedIds = new Set()

      for (let j = 0; j < numItems; j++) {
        let pid
        do { pid = productIds[Math.floor(Math.random() * productIds.length)] } while (usedIds.has(pid.id))
        usedIds.add(pid.id)
        const qty = Math.floor(Math.random() * 3) + 1
        const lineTotal = pid.price * qty
        items.push({ product_id: pid.id, product_name: pid.name, quantity: qty, unit_price: pid.price, subtotal: lineTotal })
        subtotal += lineTotal
      }

      const discount = Math.random() > 0.7 ? Math.round(subtotal * (Math.random() * 0.1 + 0.05)) : 0
      const tax = 0
      const total = subtotal - discount + tax
      const customer = Math.random() > 0.4 ? custData[Math.floor(Math.random() * custData.length)] : null

      salesData.push({
        invoice_no: `INV-${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${String(salesData.length).padStart(4, "0")}`,
        customer_id: customer?.id || null,
        employee_id: user.id,
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        payment_status: "paid",
        sale_date: date.toISOString().split("T")[0],
        created_at: date.toISOString(),
        items,
      })
    }
  }

  for (const sale of salesData) {
    const { items, ...saleRecord } = sale
    const { data: s } = await supabase.from("sales").insert(saleRecord).select().single()
    if (s) {
      await supabase.from("sale_items").insert(
        items.map((item: any) => ({ ...item, sale_id: s.id }))
      )
      if (saleRecord.customer_id) {
        const { data: c } = await supabase
          .from("customers")
          .select("total_purchases")
          .eq("id", saleRecord.customer_id)
          .single()
        if (c) {
          await supabase
            .from("customers")
            .update({ total_purchases: (c.total_purchases || 0) + saleRecord.total })
            .eq("id", saleRecord.customer_id)
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    stats: {
      categories: catData.length,
      products: prodData.length,
      customers: custData.length,
      suppliers: suppliers.length,
      sales: salesData.length,
    },
  })
}
