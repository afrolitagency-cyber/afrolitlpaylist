import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="wrap py-8">
      <Skeleton className="mb-3 h-10 w-56" />
      <Skeleton className="mb-8 h-4 w-80" />
      <GridSkeleton />
    </div>
  );
}
