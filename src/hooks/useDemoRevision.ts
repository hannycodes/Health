import { useSyncExternalStore } from "react";

import { demoDb } from "@/services";

/**
 * Re-render a component whenever the shared demo store changes.
 *
 * Used by `useServiceQuery` so a booking made in one role's browser session
 * refreshes the other role's dashboards.
 */
export function useDemoRevision(): number {
  return useSyncExternalStore(
    (listener) => demoDb.subscribe(listener),
    () => demoDb.getRevision(),
    () => 0,
  );
}
