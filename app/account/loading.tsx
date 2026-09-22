// FILE LOCATION: app/account/loading.tsx
// Put this file at app/account/loading.tsx in your project root (or src/app/account/loading.tsx if your project has a src/ folder).

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-64 rounded-2xl bg-neutral-200" />
    </div>
  );
}