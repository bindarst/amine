import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted animate-pulse",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-white/10 dark:before:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
