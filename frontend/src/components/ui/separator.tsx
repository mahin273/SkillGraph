import type * as React from "react";
import { cn } from "@/lib/utils"

function Separator({ className, orientation = "horizontal", ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "h-px w-full bg-[#edf0f5]" : "w-px self-stretch bg-[#edf0f5]",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
