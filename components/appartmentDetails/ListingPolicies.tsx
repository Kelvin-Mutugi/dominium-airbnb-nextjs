"use client";

import { useState } from "react";
import {
  FileText,
  XCircle,
  ListChecks,
  RotateCcw,
  Lock,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

interface PolicySection {
  key: string;
  icon: LucideIcon;
  title: string;
  content: string | string[];
}

interface ListingPoliciesProps {
  listing: {
    bookingTerms?: string;
    cancelationPolicy?: string;
    houserules?: string[];
    refundPolicy?: string;
    privacyPolicy?: string;
  };
}

export function ListingPolicies({ listing }: ListingPoliciesProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sections: PolicySection[] = [
    {
      key: "houserules",
      icon: ListChecks,
      title: "House rules",
      content: listing.houserules?.length ? listing.houserules : "No additional house rules were provided.",
    },
    {
      key: "bookingTerms",
      icon: FileText,
      title: "Booking terms",
      content: listing.bookingTerms || "No additional booking terms were provided.",
    },
    {
      key: "cancelationPolicy",
      icon: XCircle,
      title: "Cancellation policy",
      content: listing.cancelationPolicy || "See the platform cancellation policy.",
    },
    listing.refundPolicy && {
      key: "refundPolicy",
      icon: RotateCcw,
      title: "Refund policy",
      content: listing.refundPolicy,
    },
    listing.privacyPolicy && {
      key: "privacyPolicy",
      icon: Lock,
      title: "Privacy policy",
      content: listing.privacyPolicy,
    },
  ].filter(Boolean) as PolicySection[];

  if (sections.length === 0) return null;

  return (
    <div className="mt-4 divide-y divide-[#EDEBE4] overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.09)] md:mt-6">
      {sections.map(({ key, icon: Icon, title, content }) => {
        const isOpen = openKey === key;
        const anchorId = key === "houserules"
          ? "house-rules"
          : key === "bookingTerms"
            ? "booking-terms"
            : key === "cancelationPolicy"
              ? "cancellation-policy"
              : undefined;

        return (
          <div key={key} id={anchorId}>
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left md:gap-3 md:p-4"
              aria-expanded={isOpen}
              aria-controls={`policy-panel-${key}`}
            >
              <Icon size={18} className="h-4 w-4 shrink-0 text-[#1B1A2E] md:h-[18px] md:w-[18px]" />
              <span className="flex-1 text-sm font-medium text-[#1B1A2E] md:text-[15px]">
                {title}
              </span>
              <ChevronDown
                size={18}
                className={`h-4 w-4 shrink-0 text-[#1B1A2E]/50 transition-transform duration-200 md:h-[18px] md:w-[18px] ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              id={`policy-panel-${key}`}
              className={`grid overflow-hidden transition-all duration-200 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 px-3 pb-3 pl-9 md:px-4 md:pb-4 md:pl-[42px]">
                {Array.isArray(content) ? (
                  <ul className="list-disc space-y-1 pl-4 text-[13px] leading-5 text-[#1B1A2E]/80 md:space-y-1.5 md:text-[14px] md:leading-relaxed">
                    {content.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] leading-5 text-[#1B1A2E]/80 md:text-[14px] md:leading-relaxed">
                    {content}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}