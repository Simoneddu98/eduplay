import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-slate-800 text-slate-300 border-slate-700",
  success: "bg-green-900/50 text-green-400 border-green-800",
  warning: "bg-amber-900/50 text-amber-400 border-amber-800",
  danger:  "bg-red-900/50 text-red-400 border-red-800",
  info:    "bg-blue-900/50 text-blue-400 border-blue-800",
  purple:  "bg-purple-900/50 text-purple-300 border-purple-800",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-green-400",
  warning: "bg-amber-400",
  danger:  "bg-red-400",
  info:    "bg-blue-400",
  purple:  "bg-purple-400",
};

export function Badge({ variant = "default", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
