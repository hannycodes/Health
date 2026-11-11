import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/http";
import { useDemoRevision } from "./useDemoRevision";

export interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Minimal query hook for service calls.
 *
 * `depsKey` is a string that captures the inputs a query depends on, e.g.
 * `hospitalId` or `doctorId`. Results refresh automatically when the shared
 * demo store changes, so cross-role updates show up without a page reload.
 */
export function useServiceQuery<T>(loader: () => Promise<T>, depsKey = "") {
  const revision = useDemoRevision();
  const loaderRef = useRef(loader);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  // Keep the latest loader available to the effect without touching the ref
  // during render.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;

    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: getApiErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [depsKey, revision, nonce]);

  const refetch = useCallback(() => {
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    setNonce((value) => value + 1);
  }, []);

  return { ...state, refetch };
}
