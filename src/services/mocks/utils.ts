/** Small helpers shared by the mock service implementations. */

const DEFAULT_LATENCY_MS = 120;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates a network round trip so loading states are exercised during
 * development. Tests can await the returned promise normally.
 */
export async function respond<T>(producer: () => T, ms = DEFAULT_LATENCY_MS): Promise<T> {
  await sleep(ms);
  return producer();
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Add minutes to a `HH:mm` string, returning `HH:mm`. */
export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const next = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}
