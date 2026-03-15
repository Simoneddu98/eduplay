import { clsx } from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-3 bg-slate-800 rounded-lg animate-pulse",
              i === lines - 1 && "w-3/4",
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx("bg-slate-800 rounded-xl animate-pulse", className)}
      {...props}
    />
  );
}

// Pre-built skeleton for course cards
export function CourseCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton lines={2} />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}
