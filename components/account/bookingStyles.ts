// FILE LOCATION: components/account/bookingStyles.ts
// Shared soft styles for the booking card, its menu and its dialogs.

import { focusRing } from './ui';

/** A full-width row inside the "Manage booking" panel. */
export const menuRow = `block w-full cursor-pointer rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition-all hover:translate-x-0.5 hover:border-neutral-200 hover:bg-white hover:text-[#1B1A2E] hover:shadow-sm active:translate-x-0 active:scale-[0.99] active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 motion-reduce:transition-none ${focusRing}`;
/** The small explanation line under a menu row's title. */
export const menuHint = 'mt-0.5 block text-xs font-normal text-neutral-500';
/** The one confident action: dark, rounded, calm. */
export const inkBtn = `inline-flex items-center justify-center gap-2 rounded-full bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
/** The quiet alternative (Close, Keep booking, Not now). */
export const ghostBtn = `inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 ${focusRing}`;
/** Outlined version for in-dialog secondary steps. */
export const outlineBtn = `inline-flex items-center justify-center rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50 ${focusRing}`;
/** Shell for every <dialog>. */
export const dialogShell =
  'm-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/40';