// components/host/StatusBadge.tsx
"use client";

const STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-[#e9f7ee] text-[#1a7a3d]",
  suspended: "bg-[#fdecec] text-[#c0392b]",
  archived: "bg-gray-100 text-gray-400",
  pending: "bg-[#fff4e0] text-[#b9770e]",
  confirmed: "bg-[#e9f7ee] text-[#1a7a3d]",
  cancelled: "bg-[#fdecec] text-[#c0392b]",
  completed: "bg-[#eef1fb] text-[#3b4fa0]",
  owed: "bg-[#fff4e0] text-[#b9770e]",
  paid: "bg-[#e9f7ee] text-[#1a7a3d]",
  processing: "bg-[#eef1fb] text-[#3b4fa0]",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}
