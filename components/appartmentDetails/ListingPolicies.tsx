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
    listing.houserules?.length && {
      key: "houserules",
      icon: ListChecks,
      title: "House rules",
      content: listing.houserules,
    },
    listing.bookingTerms && {
      key: "bookingTerms",
      icon: FileText,
      title: "Booking terms",
      content: listing.bookingTerms,
    },
    listing.cancelationPolicy && {
      key: "cancelationPolicy",
      icon: XCircle,
      title: "Cancellation policy",
      content: listing.cancelationPolicy,
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
    <div className="mt-6 divide-y divide-[#EDEBE4] overflow-hidden rounded-xl bg-[#FAF9F6]">
      {sections.map(({ key, icon: Icon, title, content }) => {
        const isOpen = openKey === key;

        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="flex w-full items-center gap-3 p-4 text-left"
              aria-expanded={isOpen}
              aria-controls={`policy-panel-${key}`}
            >
              <Icon size={18} className="shrink-0 text-[#E23E85]" />
              <span className="flex-1 text-[15px] font-medium text-[#1B1A2E]">
                {title}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-[#1B1A2E]/50 transition-transform duration-200 ${
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
              <div className="min-h-0 px-4 pb-4 pl-[42px]">
                {Array.isArray(content) ? (
                  <ul className="list-disc space-y-1.5 pl-4 text-[14px] leading-relaxed text-[#1B1A2E]/80">
                    {content.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px] leading-relaxed text-[#1B1A2E]/80">
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