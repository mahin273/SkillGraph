import type * as React from "react";
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link" | "white" | "outline-white" | "ghost-white";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-[#0c66e4] text-white hover:bg-[#0055cc]",
  outline: "border border-[#cfd7e3] bg-white text-[#17202a] hover:bg-[#f7f8fa]",
  secondary: "bg-[#eef1f6] text-[#17202a] hover:bg-[#e3e9f2]",
  ghost: "bg-transparent text-[#17202a] hover:bg-[#eef1f6]",
  destructive: "bg-[#d92d20] text-white hover:bg-[#b42318]",
  link: "bg-transparent text-[#0c66e4] underline-offset-4 hover:underline",
  white: "bg-white text-[#07111f] hover:bg-white/90",
  "outline-white": "border border-white/20 bg-white/10 text-white hover:bg-white/15",
  "ghost-white": "bg-transparent text-white hover:bg-white/10 hover:text-white"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-3",
  xs: "h-7 px-2 text-xs",
  sm: "h-8 px-2.5 text-sm",
  lg: "h-10 px-4",
  icon: "h-9 w-9 p-0",
  "icon-xs": "h-7 w-7 p-0",
  "icon-sm": "h-8 w-8 p-0",
  "icon-lg": "h-11 w-11 p-0"
};

function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };
