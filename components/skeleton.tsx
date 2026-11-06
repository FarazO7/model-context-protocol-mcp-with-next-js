/** Glass placeholders while a page loads. They pulse only for users who don't prefer reduced motion. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`glass motion-safe:animate-pulse ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="h-8 w-56 rounded-xl bg-white/60 motion-safe:animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
