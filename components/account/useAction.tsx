// FILE LOCATION: components/account/useAction.ts
// Put this file at components/account/useAction.ts in your project root (or src/components/account/useAction.ts if your project has a src/ folder).

'use client';

import { useCallback, useState } from 'react';
import type { ActionResult } from '@/types/account';

/**
 * Runs a server action (or any async fn returning ActionResult) and tracks
 * pending + result state. Avoids useTransition so it works on React 18 and 19.
 */
export function useAction<Args extends unknown[]>(fn: (...args: Args) => Promise<ActionResult>) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<ActionResult> => {
      setPending(true);
      setResult(null);
      let res: ActionResult;
      try {
        res = await fn(...args);
      } catch {
        res = { ok: false, error: 'Something went wrong. Check your connection and try again.' };
      }
      setResult(res);
      setPending(false);
      return res;
    },
    [fn],
  );

  return { run, pending, result, setResult };
}