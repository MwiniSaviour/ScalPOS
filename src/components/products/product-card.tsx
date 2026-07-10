import { Package } from "lucide-react"
import { cn, formatCurrency, getStockStatus } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
}

export function ProductCard({ product, onEdit }: ProductCardProps) {
  const stock = getStockStatus(product.stock)

  return (
    <div
      className="glass-panel p-4 card-hover cursor-pointer"
      onClick={() => onEdit(product)}
    >
      <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-sidebar-hover">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <Package size={40} className="text-muted" />
        )}
      </div>
      <div className="space-y-1.5">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {product.name}
        </h3>
        <p className="text-xs text-muted truncate">
          {product.category?.name || "Uncategorized"}
        </p>
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(product.price)}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            stock.variant === "success" && "bg-success-bg text-success",
            stock.variant === "warning" && "bg-warning-bg text-warning",
            stock.variant === "danger" && "bg-danger-bg text-danger"
          )}
        >
          {stock.label} ({product.stock})
        </span>
      </div>
    </div>
  )
}
