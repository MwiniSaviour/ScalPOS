"use client";

import Link from "next/link";
import type { Crumb } from "@/lib/breadcrumbs";

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-[11px] leading-4 text-ink3">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-ink3">
                  ›
                </span>
              )}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="max-w-[110px] truncate hover:text-ink2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "max-w-[150px] truncate font-medium text-ink2" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
