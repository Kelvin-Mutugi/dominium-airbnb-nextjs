"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { supabase } from "@/app/lib/supabase/client";

const PENDING_SAVE_KEY = "dominium-pending-saved-listing";
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface SaveListingButtonProps {
  listingId: string;
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
  labelClassName?: string;
}

export default function SaveListingButton({
  listingId,
  className = "",
  iconSize = 18,
  showLabel = false,
  labelClassName = "",
}: SaveListingButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSavedState() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session) {
        if (active) setIsLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", session.user.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (!active) return;
      if (loadError) {
        setError("Saved stays are unavailable. Please try again later.");
      } else {
        setIsSaved(Boolean(data));
      }
      setIsLoading(false);

      if (sessionStorage.getItem(PENDING_SAVE_KEY) !== listingId) return;
      if (data) {
        sessionStorage.removeItem(PENDING_SAVE_KEY);
        return;
      }

      const { error: saveError } = await supabase
        .from("saved_listings")
        .upsert(
          { user_id: session.user.id, listing_id: listingId },
          { onConflict: "user_id,listing_id", ignoreDuplicates: true },
        );

      if (!active) return;
      if (saveError) {
        setError("We couldn’t save this stay. Please try again.");
      } else {
        setIsSaved(true);
        sessionStorage.removeItem(PENDING_SAVE_KEY);
      }
    }

    void loadSavedState();
    return () => {
      active = false;
    };
  }, [listingId]);

  async function toggleSaved() {
    if (isSaving || isLoading) return;
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sessionStorage.setItem(PENDING_SAVE_KEY, listingId);
      const query = searchParams.toString();
      const currentPath = query ? `${pathname}?${query}` : pathname;
      router.push(`/signin?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    setIsSaving(true);
    const result = isSaved
      ? await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", session.user.id)
          .eq("listing_id", listingId)
      : await supabase
          .from("saved_listings")
          .upsert(
            { user_id: session.user.id, listing_id: listingId },
            { onConflict: "user_id,listing_id", ignoreDuplicates: true },
          );

    if (result.error) {
      console.error("Failed to update saved listing:", result.error);
      setError("We couldn’t update saved stays. Apply the saved-listings migration and try again.");
    } else {
      setIsSaved(!isSaved);
    }
    setIsSaving(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={isSaved ? "Remove from saved stays" : "Save stay"}
        aria-pressed={isSaved}
        aria-busy={hasHydrated && (isLoading || isSaving)}
        title={error || (isSaved ? "Remove from saved stays" : "Save stay")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void toggleSaved();
        }}
        disabled={hasHydrated && (isLoading || isSaving)}
        className={className}
      >
        <Heart
          size={iconSize}
          className={isSaved ? "fill-[#E23E85] text-[#E23E85]" : ""}
          aria-hidden="true"
        />
          {showLabel && (
            <span className={labelClassName}>
              {isSaved ? "Saved" : "Save stay"}
            </span>
          )}
      </button>
      {error && <span className="sr-only" role="status">{error}</span>}
    </>
  );
}