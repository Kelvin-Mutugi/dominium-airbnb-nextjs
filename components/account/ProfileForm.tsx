// FILE LOCATION: components/account/ProfileForm.tsx
// Put this file at components/account/ProfileForm.tsx in your project root (or src/components/account/ProfileForm.tsx if your project has a src/ folder).

'use client';

import { FormEvent, useState } from 'react';
import { updateProfile } from '@/app/account/profile/actions';
import { AvatarUpload } from './AvatarUpload';
import { useAction } from './useAction';
import { Field, FormMessage, Section, btnPrimary, inputClass } from './ui';

type Props = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  isHost: boolean;
  businessName: string | null;
  hostBio: string | null;
  idNumberLast4: string | null;
};

export function ProfileForm(props: Props) {
  const [fullName, setFullName] = useState(props.fullName);
  const [phone, setPhone] = useState(props.phone);
  const [businessName, setBusinessName] = useState(props.businessName ?? '');
  const [hostBio, setHostBio] = useState(props.hostBio ?? '');
  const { run, pending, result } = useAction(updateProfile);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run({
      full_name: fullName,
      phone,
      ...(props.isHost ? { business_name: businessName, host_bio: hostBio } : {}),
    });
  }

  return (
    <div>
      <Section title="Photo" description="Hosts and guests see this next to your name.">
        <AvatarUpload userId={props.userId} name={fullName || props.fullName} avatarUrl={props.avatarUrl} />
      </Section>

      <form onSubmit={onSubmit}>
        <Section title="Personal details" description="We use these to confirm bookings and to reach you about a stay.">
          <div className="grid max-w-xl gap-5">
            <Field label="Full name" htmlFor="full_name">
              <input
                id="full_name"
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </Field>
            <Field label="Phone number" htmlFor="phone" hint="Kenyan numbers work as 0712 345 678 or +254 712 345 678.">
              <input
                id="phone"
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                aria-describedby="phone-hint"
                required
              />
            </Field>
            <Field label="Email" htmlFor="email" hint="This is the email you sign in with.">
              <input id="email" className={inputClass} value={props.email} readOnly disabled aria-describedby="email-hint" />
            </Field>
          </div>
        </Section>

        {props.isHost && (
          <Section title="Host profile" description="Guests see this on your listings.">
            <div className="grid max-w-xl gap-5">
              <Field label="Business or host name" htmlFor="business_name">
                <input
                  id="business_name"
                  className={inputClass}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  maxLength={100}
                />
              </Field>
              <Field label="About you" htmlFor="host_bio" hint={`${hostBio.length} of 1000 characters`}>
                <textarea
                  id="host_bio"
                  rows={5}
                  className={inputClass}
                  value={hostBio}
                  onChange={(e) => setHostBio(e.target.value)}
                  maxLength={1000}
                  aria-describedby="host_bio-hint"
                  placeholder="How long you’ve been hosting, what guests can expect, what you love about the area."
                />
              </Field>
              <Field label="ID number" htmlFor="id_number" hint="Verified during host onboarding. Contact support to change it.">
                <input
                  id="id_number"
                  className={inputClass}
                  value={props.idNumberLast4 ? `••••${props.idNumberLast4}` : 'Not provided'}
                  readOnly
                  disabled
                  aria-describedby="id_number-hint"
                />
              </Field>
            </div>
          </Section>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-6">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <FormMessage result={result} />
        </div>
      </form>
    </div>
  );
}