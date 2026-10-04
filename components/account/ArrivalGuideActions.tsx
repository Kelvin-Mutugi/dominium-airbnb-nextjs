'use client';

import { Download, Printer } from 'lucide-react';
import { btnSecondary } from './ui';

export type ArrivalGuideContent = {
  listingTitle: string;
  dates: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  directions: string | null;
  checkInInstructions: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  localTips: string | null;
};

export function ArrivalGuideActions({ guide }: { guide: ArrivalGuideContent }) {
  function downloadOfflineCopy() {
    const mapLink = guide.latitude !== null && guide.longitude !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${guide.latitude},${guide.longitude}`
      : null;
    const sections = [
      ['Stay', `${guide.listingTitle}\n${guide.dates}`],
      ['Address', guide.address],
      ['Pinned location', mapLink],
      ['Check-in and check-out', `Check-in: ${guide.checkInTime || 'See booking details'}\nCheck-out: ${guide.checkOutTime || 'See booking details'}`],
      ['Directions', guide.directions],
      ['Check-in steps', guide.checkInInstructions],
      ['Wi-Fi', `Network: ${guide.wifiName || 'Not provided'}\nPassword: ${guide.wifiPassword || 'Not provided'}`],
      ['Local tips', guide.localTips],
    ] as const;
    const text = [
      'DOMINIUM ARRIVAL GUIDE',
      ...sections.flatMap(([heading, content]) => content ? ['', heading.toUpperCase(), content] : []),
      '',
      'Keep this file private. It may contain access details and Wi-Fi credentials.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `arrival-guide-${guide.listingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={downloadOfflineCopy} className={btnSecondary}>
        <Download size={16} className="mr-2" aria-hidden="true" />Save offline copy
      </button>
      <button type="button" onClick={() => window.print()} className={btnSecondary}>
        <Printer size={16} className="mr-2" aria-hidden="true" />Print
      </button>
    </div>
  );
}