"use client";

import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/ui";
import { ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { crumbsForPath, type Crumb } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export function ScreenHeader({
  title,
  onBack,
  right,
  subtitle,
  largeTitle = false,
  className,
  crumbs,
  showBreadcrumbs = true,
}: {
  title: ReactNode;
  onBack?: boolean | (() => void);
  right?: ReactNode;
  subtitle?: ReactNode;
  largeTitle?: boolean;
  className?: string;
  crumbs?: Crumb[];
  showBreadcrumbs?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const derived = useMemo(() => crumbsForPath(pathname ?? "/"), [pathname]);
  const items = crumbs ?? derived;
  return (
    <header className={cn("sticky top-0 z-40 border-b border-line2 bg-bg", className)}>
      <div className="safe-t" />
      {showBreadcrumbs && (
        <div className="px-4 pb-1 pt-1">
          <Breadcrumbs items={items} />
        </div>
      )}
      <div className={cn("flex items-center gap-2 px-2 pb-2", largeTitle ? "h-14" : "h-13")}>
        {onBack && (
          <IconButton
            label="Back"
            onClick={typeof onBack === "function" ? onBack : () => router.back()}
            className="text-ink"
          >
            <ChevronLeft className="size-[22px]" strokeWidth={2.2} />
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={cn("truncate font-bold text-ink", largeTitle ? "text-[20px]" : "text-[17px]")}>{title}</h1>
          {subtitle && <p className="truncate text-[12px] text-ink3">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1 pr-1">{right}</div>}
      </div>
    </header>
  );
}
