// FILE LOCATION: app/account/loading.tsx
// Put this file at app/account/loading.tsx in your project root (or src/app/account/loading.tsx if your project has a src/ folder).

export default function Loading() {
  return (
    <div className="w-full min-w-0 space-y-7 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading account">
      <div className="space-y-2">
        <div className="h-8 w-2/3 max-w-sm rounded-xl bg-neutral-100 sm:h-9" />
        <div className="h-4 w-full max-w-md rounded-lg bg-neutral-100" />
      </div>

      <section className="account-neu-surface overflow-hidden rounded-3xl" aria-hidden="true">
        <div className="h-36 w-full bg-neutral-100 md:h-52" />
        <div className="space-y-4 p-4 sm:p-6">
          <div className="h-4 w-36 rounded-lg bg-neutral-100" />
          <div className="h-7 w-3/4 max-w-lg rounded-lg bg-neutral-100" />
          <div className="h-4 w-2/5 max-w-xs rounded-lg bg-neutral-100" />
          <div className="grid gap-2 rounded-2xl bg-neutral-50 p-3 sm:grid-cols-3 sm:p-4">
            <div className="h-12 rounded-xl bg-white" />
            <div className="h-12 rounded-xl bg-white" />
            <div className="h-12 rounded-xl bg-white" />
          </div>
          <div className="h-11 w-full rounded-full bg-neutral-100 sm:w-44" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-hidden="true">
        <div className="account-neu-surface h-20 rounded-2xl" />
        <div className="account-neu-surface h-20 rounded-2xl" />
        <div className="account-neu-surface h-20 rounded-2xl" />
        <div className="account-neu-surface h-20 rounded-2xl" />
      </div>

      <section className="space-y-3" aria-hidden="true">
        <div className="h-6 w-40 rounded-lg bg-neutral-100" />
        <div className="space-y-3">
          <div className="account-neu-surface flex min-w-0 items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
            <div className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-lg bg-neutral-100" />
              <div className="h-3 w-1/2 rounded-lg bg-neutral-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-neutral-100" />
          </div>
          <div className="account-neu-surface hidden items-center gap-4 rounded-2xl p-4 sm:flex">
            <div className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-lg bg-neutral-100" />
              <div className="h-3 w-2/5 rounded-lg bg-neutral-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-neutral-100" />
          </div>
        </div>
      </section>
    </div>
  );
}