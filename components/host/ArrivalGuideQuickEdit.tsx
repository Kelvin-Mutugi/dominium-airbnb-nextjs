"use client";

import { useState } from "react";
import { updateHostArrivalGuide } from "@/app/lib/host/actions";
import type { HostArrivalGuideDetails } from "@/app/lib/host/types";

export default function ArrivalGuideQuickEdit({
  listingId,
  initialGuide,
  onSaved,
}: {
  listingId: string;
  initialGuide: HostArrivalGuideDetails | null;
  onSaved: (guide: HostArrivalGuideDetails) => void;
}) {
  const [guide, setGuide] = useState<HostArrivalGuideDetails>(initialGuide ?? {
    arrival_address: "",
    arrival_directions: "",
    check_in_instructions: "",
    wifi_name: "",
    wifi_password: "",
    arrival_contact: "",
    local_tips: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateField(field: keyof HostArrivalGuideDetails, value: string) {
    setGuide((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function saveGuide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateHostArrivalGuide(listingId, guide);
      onSaved(guide);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save the arrival guide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveGuide} className="space-y-3 border-t border-[#12231d]/10 bg-[#faf8f4] p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`arrival-address-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Arrival address</label>
          <input id={`arrival-address-${listingId}`} value={guide.arrival_address ?? ""} onChange={(event) => updateField("arrival_address", event.target.value)} maxLength={1000} className="w-full rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div>
          <label htmlFor={`arrival-directions-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Directions</label>
          <textarea id={`arrival-directions-${listingId}`} value={guide.arrival_directions ?? ""} onChange={(event) => updateField("arrival_directions", event.target.value)} maxLength={5000} rows={3} className="w-full resize-y rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div>
          <label htmlFor={`arrival-instructions-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Check-in instructions</label>
          <textarea id={`arrival-instructions-${listingId}`} value={guide.check_in_instructions ?? ""} onChange={(event) => updateField("check_in_instructions", event.target.value)} maxLength={5000} rows={3} className="w-full resize-y rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div>
          <label htmlFor={`arrival-contact-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Arrival contact</label>
          <input id={`arrival-contact-${listingId}`} value={guide.arrival_contact ?? ""} onChange={(event) => updateField("arrival_contact", event.target.value)} maxLength={500} className="w-full rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div>
          <label htmlFor={`arrival-wifi-name-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Wi-Fi network</label>
          <input id={`arrival-wifi-name-${listingId}`} value={guide.wifi_name ?? ""} onChange={(event) => updateField("wifi_name", event.target.value)} maxLength={120} className="w-full rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div>
          <label htmlFor={`arrival-wifi-password-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Wi-Fi password</label>
          <input id={`arrival-wifi-password-${listingId}`} value={guide.wifi_password ?? ""} onChange={(event) => updateField("wifi_password", event.target.value)} maxLength={200} className="w-full rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`arrival-local-tips-${listingId}`} className="mb-1 block text-xs font-semibold text-[#565c57]">Local tips</label>
          <textarea id={`arrival-local-tips-${listingId}`} value={guide.local_tips ?? ""} onChange={(event) => updateField("local_tips", event.target.value)} maxLength={5000} rows={2} className="w-full resize-y rounded-md border border-[#d8d8d1] bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#315b47] focus:outline-none focus:ring-2 focus:ring-[#315b47]/15" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-[#397653]">{saved ? "Arrival guide saved." : "These details appear in the guest arrival guide."}</p>
        <button type="submit" disabled={saving} className="rounded-md bg-[#12231d] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#294238] disabled:cursor-wait disabled:opacity-60">
          {saving ? "Saving…" : "Save arrival guide"}
        </button>
      </div>
    </form>
  );
}