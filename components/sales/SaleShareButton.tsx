"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";

export function SaleShareButton({
  title,
  url,
  iconOnly = false,
  className = "",
}: {
  title: string;
  url: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [message, setMessage] = useState("");
  const [manualCopyUrl, setManualCopyUrl] = useState("");
  const messageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
  }, []);

  function showMessage(nextMessage: string, manualUrl = "") {
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    setMessage(nextMessage);
    setManualCopyUrl(manualUrl);
    if (nextMessage === "Link copied") {
      messageTimeout.current = setTimeout(() => {
        setMessage("");
        messageTimeout.current = null;
      }, 2500);
    }
  }

  async function shareProperty() {
    const shareUrl = new URL(url, window.location.origin).toString();
    const shareData = {
      title,
      text: `Take a look at ${title} for sale on Dominium.`,
      url: shareUrl,
    };
    showMessage("");

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(shareUrl);
      showMessage("Link copied");
      return;
    } catch {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        input.remove();
      }
      if (copied) {
        showMessage("Link copied");
        return;
      }
    }

    showMessage("Copy this link", shareUrl);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => void shareProperty()}
        aria-label={`Share ${title}`}
        title="Share property"
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E6E2DC] bg-white font-semibold text-[#1B1A2E] shadow-sm transition hover:border-[#9C2454] hover:text-[#9C2454] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] ${
          iconOnly ? "h-11 w-11" : "px-4 text-sm"
        }`}
      >
        <Share2 size={17} aria-hidden="true" />
        {!iconOnly && "Share"}
      </button>
      {message && (
        <div
          className={`z-20 rounded-lg border border-[#E6E2DC] bg-white p-2 text-xs text-[#383746] shadow-md ${
            iconOnly ? "absolute right-0 top-full mt-2 w-56" : "mt-2"
          }`}
        >
          <p role="status">{message}</p>
          {manualCopyUrl && (
            <input
              aria-label="Property link to copy"
              readOnly
              value={manualCopyUrl}
              onFocus={(event) => event.currentTarget.select()}
              onClick={(event) => event.currentTarget.select()}
              className="mt-1 w-full select-all rounded border border-[#D9D5CF] px-2 py-1 text-xs"
            />
          )}
        </div>
      )}
    </div>
  );
}
