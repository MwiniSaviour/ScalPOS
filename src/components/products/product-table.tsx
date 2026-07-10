import { Package, Eye, Edit, Trash2 } from "lucide-react"
import { formatCurrency, getStockStatus, cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  return (
    <div className="space-y-3">
      {products.map((product) => {
        const stock = getStockStatus(product.stock)
        return (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            {/* Product Image */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sidebar-hover overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package size={24} className="text-muted" />
              )}
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
                onClick={() => onEdit(product)}
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
