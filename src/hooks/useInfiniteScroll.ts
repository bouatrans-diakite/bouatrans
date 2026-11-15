import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseInfiniteScrollOptions {
  initialBatchSize?: number;
  stepSize?: number;
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {},
) {
  const { initialBatchSize = 6, stepSize = 6 } = options;
  const [visibleCount, setVisibleCount] = useState(initialBatchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + stepSize));
  }, [items.length, stepSize]);

  const reset = useCallback(() => {
    setVisibleCount(initialBatchSize);
  }, [initialBatchSize]);

  // Keep visibleCount clamped if total items shrink below current visibleCount,
  // but ensure at least initialBatchSize is shown when items arrive.
  useEffect(() => {
    setVisibleCount((prev) => {
      if (items.length === 0) return initialBatchSize;
      if (prev < initialBatchSize) return Math.min(items.length, initialBatchSize);
      return prev;
    });
  }, [items.length, initialBatchSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: '180px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, items.length, loadMore]);

  const clampedVisibleCount = Math.min(visibleCount, items.length);
  const visibleItems = items.slice(0, clampedVisibleCount);
  const hasMore = clampedVisibleCount < items.length;

  return {
    visibleItems,
    visibleCount: clampedVisibleCount,
    totalCount: items.length,
    hasMore,
    loadMore,
    reset,
    sentinelRef,
  };
}
