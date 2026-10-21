import { avatarColor, cn } from "@/lib/ui";

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-line font-semibold",
        avatarColor(),
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}
