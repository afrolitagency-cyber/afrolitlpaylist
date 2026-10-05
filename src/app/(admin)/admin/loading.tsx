import { RowSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <Skeleton className="mb-4 h-8 w-48" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <RowSkeleton />
    </div>
  );
}
