// FILE LOCATION: components/account/bookingStyles.ts
// Shared soft styles for the booking card, its menu and its dialogs.

import { focusRing } from './ui';

/** A full-width row inside the "Manage booking" panel. */
export const menuRow = `block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition-all hover:translate-x-0.5 hover:bg-white hover:text-[#1B1A2E] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.07),-3px_-3px_7px_rgba(255,255,255,0.9)] active:translate-x-0 active:scale-[0.99] active:bg-neutral-100 active:shadow-[inset_2px_2px_5px_rgba(27,26,46,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 motion-reduce:transition-none ${focusRing}`;
/** The small explanation line under a menu row's title. */
export const menuHint = 'mt-0.5 block text-xs font-normal leading-5 text-neutral-600';
/** The one confident action: dark, rounded, calm. */
export const inkBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(27,26,46,0.12)] transition-all hover:bg-[#302F43] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.12),-2px_-2px_6px_rgba(255,255,255,0.4)] active:bg-[#11101F] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;
/** The quiet alternative (Close, Keep booking, Not now). */
export const ghostBtn = `inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 hover:shadow-[3px_3px_7px_rgba(27,26,46,0.06),-3px_-3px_7px_rgba(255,255,255,0.9)] active:bg-neutral-100 active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.05)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;
/** Outlined version for in-dialog secondary steps. */
export const outlineBtn = `inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-50 px-5 py-2.5 text-sm font-medium text-neutral-800 shadow-[inset_1px_1px_3px_rgba(27,26,46,0.035),inset_-1px_-1px_3px_rgba(255,255,255,0.9)] transition-all hover:bg-neutral-100 active:bg-neutral-100 active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.06)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;
/** Shell for every <dialog>. */
export const dialogShell =
  'fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-0 text-neutral-900 shadow-[0_2px_18px_rgba(27,26,46,0.14),-2px_-2px_8px_rgba(255,255,255,0.8)] backdrop:bg-neutral-900/40 md:inset-0 md:m-auto md:w-[calc(100%-2rem)] md:max-w-md md:rounded-3xl';