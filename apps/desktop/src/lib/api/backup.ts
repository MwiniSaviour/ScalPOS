import {
  fetchCategories,
  fetchCustomers,
  fetchProducts,
  fetchSales,
  fetchSettings,
  fetchStaff,
  fetchSuppliers,
} from "@/lib/api/data"

export async function exportBackup(): Promise<void> {
  const [settings, categories, products, customers, sales, staff, suppliers] = await Promise.all([
    fetchSettings(),
    fetchCategories(),
    fetchProducts(),
    fetchCustomers(),
    fetchSales(),
    fetchStaff(),
    fetchSuppliers(),
  ])
  const payload = {
    app: "ScalPOS",
    format: "scalpos-backup-v1",
    exported_at: new Date().toISOString(),
    settings,
    categories,
    products,
    customers,
    sales,
    staff,
    suppliers,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `scalpos-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
