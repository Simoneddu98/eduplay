import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZES = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={clsx("animate-spin text-purple-600", SIZES[size])} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
