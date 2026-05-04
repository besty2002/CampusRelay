import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** Number of items per page */
  pageSize?: number;
  /** Root margin for IntersectionObserver (px before reaching bottom) */
  rootMargin?: string;
}

/**
 * Custom hook for infinite scroll with IntersectionObserver.
 * Returns a sentinelRef to attach to a div at the bottom of the list.
 */
export function useInfiniteScroll({ pageSize = 20, rootMargin = '400px' }: UseInfiniteScrollOptions = {}) {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setPage(prev => prev + 1);
  }, [hasMore, loadingMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore, rootMargin]);

  const reset = useCallback(() => {
    setPage(0);
    setHasMore(true);
    setLoadingMore(false);
  }, []);

  return {
    page,
    pageSize,
    hasMore,
    setHasMore,
    loadingMore,
    setLoadingMore,
    sentinelRef,
    reset,
  };
}
