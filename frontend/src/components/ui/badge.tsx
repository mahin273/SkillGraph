import type * as React from "react";
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "none";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#0c66e4] text-white",
  secondary: "bg-[#eef1f6] text-[#17202a]",
  destructive: "bg-[#ffebe6] text-[#ae2a19]",
  outline: "border border-[#dfe3ea] text-[#17202a]",
  ghost: "text-[#17202a]",
  link: "text-[#0c66e4] underline",
  none: ""
};

function Badge({ className, variant, ...props }: BadgeProps) {
  const hasCustomBg = className?.includes("bg-");
  const hasCustomText = className?.includes("text-");
  const resolvedVariant = variant || ((hasCustomBg || hasCustomText) ? "none" : "default");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badgeVariantClasses[resolvedVariant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
