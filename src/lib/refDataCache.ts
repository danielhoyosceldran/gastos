// Session cache for reference data (categories, tags, payment methods, …).
// These tables change rarely but are read on most pages; without a cache every
// navigation refetches all of them. The cache holds one resolved value per
// session and is invalidated by the settings services on any mutation.

type Listener = () => void;

let cache: unknown = null;
let inflight: Promise<unknown> | null = null;
const listeners = new Set<Listener>();

/**
 * Returns cached reference data, or runs `loader` once and caches the result.
 * Concurrent callers during the initial load share the same in-flight promise.
 */
export function getRefData<T>(loader: () => Promise<T>): Promise<T> {
  if (cache !== null) return Promise.resolve(cache as T);
  if (inflight) return inflight as Promise<T>;

  const pending = loader().then((data) => {
    // Only commit if this load wasn't invalidated while in flight.
    if (inflight === pending) cache = data;
    return data;
  });
  inflight = pending;
  pending.finally(() => {
    if (inflight === pending) inflight = null;
  });
  return pending;
}

/** Drops the cache and notifies subscribers so mounted consumers refetch. */
export function invalidateRefData(): void {
  cache = null;
  inflight = null;
  listeners.forEach((l) => l());
}

export function subscribeRefData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
