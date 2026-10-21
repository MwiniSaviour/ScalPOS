"use client";

import { useState } from "react";
import { cn } from "@/lib/ui";
import { useImageSrc } from "@/lib/use-image-src";

/* Product artwork: photo when available, otherwise a neutral monogram tile. No emoji. */
export function ProductArt({
  imageUrl,
  name,
  className,
  imgClassName,
}: {
  imageUrl?: string;
  name?: string;
  className?: string;
  imgClassName?: string;
}) {
  const src = useImageSrc(imageUrl);
  const [broken, setBroken] = useState<string | null>(null);

  if (src && broken !== src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        onError={() => setBroken(src)}
        className={cn("shrink-0 aspect-square object-cover", className, imgClassName)}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-surface2 select-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="44"
          fontWeight="700"
          className="fill-ink3"
        >
          {((name ?? "?").trim()[0] ?? "?").toUpperCase()}
        </text>
      </svg>
    </span>
  );
}
