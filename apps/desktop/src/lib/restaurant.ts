/**
 * Pure restaurant helpers, mirroring the mobile app's lib/restaurant.ts so
 * both apps label tickets and menu choices the same way.
 */

/** The short ticket number, e.g. "0004" from "ORD-20261112-0004". */
export function ticketNumber(invoiceNo: string): string {
  const seg = invoiceNo.split("-").pop()
  return seg && seg !== "" ? seg : invoiceNo
}

/** "Dine-in" / "Takeaway" / "Delivery"; unknown values are title-cased. */
export function orderTypeLabel(orderType?: string | null): string {
  if (!orderType) return ""
  const known: Record<string, string> = {
    "dine-in": "Dine-in",
    dine_in: "Dine-in",
    dinein: "Dine-in",
    takeaway: "Takeaway",
    take_away: "Takeaway",
    delivery: "Delivery",
  }
  const key = orderType.toLowerCase().replace(/\s+/g, "-")
  return known[key] ?? orderType.charAt(0).toUpperCase() + orderType.slice(1)
}

/** "Large · Extra plantain" — the chosen variant and modifiers of a line. */
export function itemChoices(i: {
  variant_name?: string | null
  modifier_names?: string[] | null
}): string {
  const parts = [
    i.variant_name ?? "",
    ...(i.modifier_names ?? []),
  ].filter((s) => s !== "")
  return parts.join(" · ")
}
