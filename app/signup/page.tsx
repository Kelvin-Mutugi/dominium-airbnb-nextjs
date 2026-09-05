'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/client'

type FormState = {
  fullName: string
  email: string
  phone: string
  password: string
  wantsToHost: boolean
}

const initialState: FormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  wantsToHost: false,
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password.length < 8) {
      setError('Password needs to be at least 8 characters.')
      return
    }
    if (!/^0\d{9}$/.test(form.phone)) {
      setError('Enter a valid phone number, e.g. 0712345678.')
      return
    }

    setSubmitting(true)

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
      },
    })

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      // Email confirmation is likely required before a session exists.
      // The profile row is created by a database trigger in this case —
      // see the note below the form.
      setSubmitting(false)
      router.push('/signup/check-email')
      return
    }

    // 2. Write the profile row
    // was: const roles = form.wantsToHost ? ['guest', 'host'] : ['guest']
    const role = form.wantsToHost ? 'host' : 'guest'

    const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: form.fullName,
        phone: form.phone,
        role, 
    })

    setSubmitting(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    router.push(form.wantsToHost ? '/host/onboarding' : '/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#12231d] px-6">
      <div className="w-full max-w-sm bg-[#f6f4ee] rounded-sm px-8 py-10">
        <h1 className="font-serif text-[28px] text-[#12231d] mb-2">
          Create your account
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-7">
          Book stays across Kenya, or list a place of your own.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-[18px]">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Full name</span>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              autoComplete="name"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Phone number</span>
            <input
              type="tel"
              required
              placeholder="0712345678"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              autoComplete="tel"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-row items-center gap-2.5 text-sm text-[#4b5850]">
            <input
              type="checkbox"
              checked={form.wantsToHost}
              onChange={(e) => update('wantsToHost', e.target.checked)}
              className="h-4 w-4 accent-[#12231d]"
            />
            <span>I want to list a property as a host</span>
          </label>

          {error && (
            <p role="alert" className="text-[#a3352b] text-[13px] -mt-1.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  )
}