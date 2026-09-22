// FILE LOCATION: lib/routes.ts
// Put this file at lib/routes.ts in your project root (or src/lib/routes.ts if your project has a src/ folder).

// One place to point the account area at your real routes.
export const routes = {
  home: '/',
  login: '/login',
  listings: '/listings',
  listing: (slug: string) => `/listings/${slug}`,
  becomeHost: '/host/apply', // TODO: your host onboarding route
} as const;