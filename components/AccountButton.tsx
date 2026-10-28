'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { useProgress } from './ProgressProvider'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, options: { theme: string; size: string }) => void
        }
      }
    }
  }
}

export function AccountButton() {
  const { signedIn, signInWithGoogle, signOut } = useProgress()
  const [open, setOpen] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open || signedIn || !googleReady || !googleButtonRef.current || !window.google) return

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: async response => {
        setError(null)
        setBusy(true)
        try {
          await signInWithGoogle(response.credential)
          setOpen(false)
        } catch {
          setError('Could not sign in with Google. Try again in a moment.')
        } finally {
          setBusy(false)
        }
      }
    })
    window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'medium' })
  }, [open, signedIn, googleReady, signInWithGoogle])

  return (
    <div ref={containerRef} className="fixed right-4 top-4 z-20">
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onReady={() => setGoogleReady(true)} />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Account"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/80 backdrop-blur transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:hover:bg-white/10 ${
          signedIn ? 'text-emerald-500' : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 space-y-3 rounded-xl border border-black/10 bg-white p-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900">
          {signedIn ? (
            <>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Signed in. Your progress is saved to your account.</p>
              <button
                type="button"
                onClick={() => {
                  signOut()
                  setOpen(false)
                }}
                className="w-full rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Sign in with Google to keep your progress across devices. Progress on this device is moved to your account.
              </p>
              <div ref={googleButtonRef} className={busy ? 'pointer-events-none opacity-50' : undefined} />
              {busy && <p className="text-xs text-zinc-500">Signing in…</p>}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
