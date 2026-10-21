import { cn } from "@/lib/ui";

/**
 * Read-only echo of the receipt head — the same visual language as the
 * receipt itself, used wherever the shop's receipt details are previewed.
 */
export function ReceiptPreview({
  shopName,
  address,
  phone,
  footer,
  className,
}: {
  shopName: string;
  address?: string;
  phone?: string;
  footer?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface2 px-3.5 py-3", className)}>
      <div className="break-words text-[15px] font-bold text-ink">
        {shopName || "Your shop name"}
      </div>
      <div className="mt-0.5 text-[12px] leading-5 text-ink3">
        {address || "Your address"}
      </div>
      <div className="tabnum mt-0.5 text-[12px] text-ink3">{phone || "Your phone"}</div>
      <div className="mt-2.5 border-t border-dashed border-line2 pt-2 text-[12px] text-ink3">
        {footer || "Receipt footer message"}
      </div>
    </div>
  );
}
