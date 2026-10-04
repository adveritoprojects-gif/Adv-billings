export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-white/10 dark:border-t-brand-500" />
          <div className="h-5 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
