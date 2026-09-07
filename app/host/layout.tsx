// app/host/layout.tsx
import { requireHost } from "@/app/lib/host-auth";
import { HostSidebar } from "@/components/host/sidebar";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireHost();

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <HostSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}