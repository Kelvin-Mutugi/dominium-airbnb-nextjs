// app/host/layout.tsx
import HostSidebar from "@/components/host/sidebar";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="host-panel flex min-h-dvh bg-[#f6f6f6] md:h-dvh md:overflow-hidden">
      <HostSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))] md:h-dvh md:overflow-y-auto md:overscroll-contain md:px-8 md:py-8 md:pb-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
