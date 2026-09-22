// FILE LOCATION: components/account/AvatarUpload.tsx
// Put this file at components/account/AvatarUpload.tsx in your project root (or src/components/account/AvatarUpload.tsx if your project has a src/ folder).

'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { updateAvatar } from '@/app/account/profile/actions';
import { createClient } from '@/app/lib/supabase/client';
import { Avatar, btnSecondary, textLink } from './ui';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = TYPES[file.type];
    if (!ext) return setError('Choose a JPG, PNG or WebP image.');
    if (file.size > MAX_BYTES) return setError('That image is over 2 MB. Choose a smaller one.');

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setBusy(false);
      return setError('The upload didn’t go through. Try again.');
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const res = await updateAvatar(data.publicUrl);
    setBusy(false);
    if (res.ok) setUrl(data.publicUrl);
    else setError(res.error);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await updateAvatar(null);
    setBusy(false);
    if (res.ok) setUrl(null);
    else setError(res.error);
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} url={url} size="lg" />
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={btnSecondary}>
            {busy ? 'Working…' : url ? 'Change photo' : 'Upload photo'}
          </button>
          {url && !busy && (
            <button type="button" onClick={remove} className={textLink}>
              Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">JPG, PNG or WebP, up to 2 MB.</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-rose-700">
            {error}
          </p>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="sr-only" tabIndex={-1} />
      </div>
    </div>
  );
}