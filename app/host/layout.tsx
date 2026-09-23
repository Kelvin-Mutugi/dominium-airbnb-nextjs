// app/host/layout.tsx
import HostSidebar from "@/components/host/sidebar";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f3efe9] md:h-screen md:overflow-hidden">
      <HostSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 pb-20 pt-16 md:h-screen md:overflow-y-auto md:overscroll-contain md:px-8 md:py-8 md:pb-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
