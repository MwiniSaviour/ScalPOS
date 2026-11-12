import { Package, Eye, Edit, Trash2, TriangleAlert } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { useImageSrc } from "@/lib/api/image"
import type { Product, ProductBatch } from "@/lib/types"

interface ProductTableProps {
  products: Product[]
  batches: ProductBatch[]
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
}

function ProductCellImage({ image, name }: { image: string | null; name: string }) {
  const src = useImageSrc(image)
  return src ? (
    <img src={src} alt={name} className="h-full w-full object-cover" />
  ) : (
    <Package size={24} className="text-muted" />
  )
}

/** Days from today until an expiry date; negative when already expired. */
function daysToExpiry(expiry: string): number | null {
  const time = Date.parse(`${expiry}T00:00:00Z`)
  if (!Number.isFinite(time)) return null
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((time - today) / 86400000)
}

/** The soonest expiry date of each product; batches without an expiry are ignored. */
function soonestExpiry(batches: ProductBatch[]): Map<string, string> {
  const soonest = new Map<string, string>()
  for (const batch of batches) {
    if (!batch.expiry) continue
    const current = soonest.get(batch.product_id)
    if (!current || batch.expiry < current) soonest.set(batch.product_id, batch.expiry)
  }
  return soonest
}

export function ProductTable({ products, batches, onView, onEdit, onDelete }: ProductTableProps) {
  const expiryByProduct = soonestExpiry(batches)
  return (
    <div className="space-y-3">
      {products.map((product) => {
        const expiry = expiryByProduct.get(product.id)
        const expiryDays = expiry ? daysToExpiry(expiry) : null
        const risky = expiryDays !== null && expiryDays <= 90
        return (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            {/* Product Image */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sidebar-hover overflow-hidden">
              <ProductCellImage image={product.image} name={product.name} />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{product.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    product.stock > 0
                      ? "bg-success-bg text-success"
                      : "bg-danger-bg text-danger"
                  )}
                >
                  {product.stock > 0 ? "Active" : "Inactive"}
                </span>
                {risky && expiryDays !== null && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger"
                    title={`${expiryDays < 0 ? "Expired" : `Expires in ${expiryDays} days`} — ${expiry}`}
                  >
                    <TriangleAlert size={12} />
                    {expiryDays < 0 ? "Expired" : `${expiryDays}d`}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted">SKU: {product.sku}</p>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
                <span className="text-muted">Stock: {product.stock}</span>
                <span className="text-muted">{product.category?.name || "Uncategorized"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onView(product)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                title="View"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() => onEdit(product)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                title="Edit"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger transition-all"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
