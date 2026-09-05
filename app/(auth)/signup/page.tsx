'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignup() {
    setError(null)
    setLoading(true)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Sends the user here after Google auth completes; this route
        // exchanges the code for a session, then decides where to send
        // them next (see auth/callback/route.ts).
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
    // On success the browser redirects to Google — no further code runs here.
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#12231d] px-6">
      <div className="w-full max-w-sm bg-[#f6f4ee] rounded-sm px-8 py-10 text-center">
        <h1 className="font-serif text-[28px] text-[#12231d] mb-2">
          Create your account
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-8">
          Book stays across Kenya, or list a place of your own.
        </p>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] text-[15px] disabled:opacity-60 disabled:cursor-default"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="text-[#a3352b] text-[13px] mt-4">
            {error}
          </p>
        )}

        <p className="text-[#4b5850] text-[13px] mt-8">
          We'll ask for your phone number and a couple of other details
          right after you sign in.
        </p>
      </div>
    </main>
  )
}