"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, FileText, ShieldCheck, X } from "lucide-react";

type HostIdDocumentViewerProps = {
  frontUrl: string;
  backUrl: string | null;
  documentType: string;
  hostName: string;
  isPassport: boolean;
  frontPreviewKind: "image" | "pdf" | "other";
  backPreviewKind: "image" | "pdf" | "other";
};

function DocumentSidePreview({
  url,
  previewKind,
  label,
  alt,
}: {
  url: string | null;
  previewKind: "image" | "pdf" | "other";
  label: string;
  alt: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1B1A2E]">{label}</h3>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#CF2F74]"
          >
            Open original
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </header>
      <div className="flex min-h-72 items-center justify-center bg-gray-100 p-3">
        {!url ? (
          <div className="max-w-xs px-4 text-center">
            <FileText aria-hidden="true" className="mx-auto size-8 text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-700">Back side not submitted</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Request both sides of the national ID before approving.
            </p>
          </div>
        ) : previewKind === "image" && !imageFailed ? (
          <Image
            src={url}
            alt={alt}
            width={1600}
            height={1200}
            unoptimized
            onError={() => setImageFailed(true)}
            className="max-h-[min(60vh,42rem)] w-auto max-w-full rounded-md object-contain shadow-md"
          />
        ) : previewKind === "pdf" ? (
          <iframe
            src={url}
            title={alt}
            className="h-[min(60vh,42rem)] min-h-72 w-full rounded-md border border-gray-200 bg-white"
          />
        ) : (
          <div className="max-w-xs px-4 text-center">
            <FileText aria-hidden="true" className="mx-auto size-8 text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              {imageFailed ? "Preview could not be loaded" : "Preview unavailable"}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Use “Open original” to review this file.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export function HostIdDocumentViewer({
  frontUrl,
  backUrl,
  documentType,
  hostName,
  isPassport,
  frontPreviewKind,
  backPreviewKind,
}: HostIdDocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);

  function closePreview() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#D9D5CF] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1B1A2E] shadow-sm transition hover:border-[#E23E85] hover:bg-pink-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85] focus-visible:ring-offset-2"
      >
        <FileText aria-hidden="true" className="size-4 text-[#CF2F74]" />
        View private ID
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
          Private
        </span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onClose={() => setIsOpen(false)}
            onClick={(event) => {
              if (event.target === event.currentTarget) closePreview();
            }}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[min(72rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl border-0 bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm"
          >
            <section className="flex max-h-[calc(100dvh-2rem)] flex-col">
              <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#CF2F74]">
                    <ShieldCheck aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CF2F74]">
                      Host identity review
                    </p>
                    <h2 id={titleId} className="truncate text-base font-semibold text-[#1B1A2E] sm:text-lg">
                      {isPassport ? "Private passport document" : "Private national ID"}
                    </h2>
                    <p className="truncate text-xs text-gray-500">
                      {hostName} · {documentType}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={closePreview}
                  aria-label="Close ID document preview"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85]"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-auto bg-[#F3F4F6] p-3 sm:p-5">
                <div className={`grid gap-4 ${isPassport ? "mx-auto max-w-3xl" : "xl:grid-cols-2"}`}>
                  <DocumentSidePreview
                    url={frontUrl}
                    previewKind={frontPreviewKind}
                    label={isPassport ? "Passport" : "Front side"}
                    alt={`${documentType} ${isPassport ? "passport" : "front side"} submitted by ${hostName}`}
                  />
                  {!isPassport && (
                    <DocumentSidePreview
                      url={backUrl}
                      previewKind={backPreviewKind}
                      label="Back side"
                      alt={`${documentType} back side submitted by ${hostName}`}
                    />
                  )}
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:px-6">
                <p className="max-w-xl text-xs leading-5 text-gray-500">
                  <span className="font-semibold text-gray-700">Confidential.</span>{" "}
                  Use this document only to verify the host&apos;s identity.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closePreview}
                    className="rounded-lg bg-[#1B1A2E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85] focus-visible:ring-offset-2"
                  >
                    Close preview
                  </button>
                </div>
              </footer>
            </section>
          </dialog>,
          document.body,
        )}
    </>
  );
}
