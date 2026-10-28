'use client'

import {
  usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey,
  usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation
} from '@accelbyte/sdk-cloudsave/react-query'
import { useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3 } from '@accelbyte/sdk-iam/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createLoginSdk, createUserSdk, PROGRESS_KEY } from '@/lib/ags/client'
import {
  clearLocalProgress,
  getLocalProgress,
  mergeProgress,
  setLocalProgress,
  withCompletion,
  type LevelProgress,
  type ProgressMap
} from '@/lib/progress'

interface ProgressState {
  progress: ProgressMap
  signedIn: boolean
  signInWithGoogle: (idToken: string) => Promise<void>
  signOut: () => void
  recordCompletion: (id: string, timeMs: number) => LevelProgress
}

const queryClient = new QueryClient()

const ProgressContext = createContext<ProgressState | null>(null)

const hasEntries = (map: ProgressMap) => Object.keys(map).length > 0

const isNotFound = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status === 404

function ProgressStateProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressMap>({})
  const [userId, setUserId] = useState<string | null>(null)
  const progressRef = useRef<ProgressMap>({})
  // consumed once the account's record has loaded after a sign-in
  const pendingSyncRef = useRef(false)

  const applyProgress = useCallback((map: ProgressMap) => {
    progressRef.current = map
    setProgress(map)
  }, [])

  const endSession = useCallback(() => {
    setUserId(null)
    pendingSyncRef.current = false
    applyProgress(getLocalProgress())
  }, [applyProgress])

  const loginSdk = useMemo(createLoginSdk, [])
  const user = useMemo(() => createUserSdk(endSession), [endSession])
  const sdk = user.sdk

  const { mutateAsync: googleLogin } = useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3(loginSdk)

  const record = usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey(
    sdk,
    { userId: userId ?? '', key: PROGRESS_KEY },
    { enabled: userId !== null, retry: false, staleTime: Infinity }
  )
  const { mutateAsync: saveRecord } = usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation(sdk)

  useEffect(() => applyProgress(getLocalProgress()), [applyProgress])

  // After sign-in the account's progress wins over this device's; local progress is only uploaded
  // (and then cleared) when the account has none.
  useEffect(() => {
    if (!userId || !pendingSyncRef.current) return
    const missing = record.isError && isNotFound(record.error)
    if (!record.isSuccess && !missing) return
    pendingSyncRef.current = false

    const remote = ((record.data?.value as { progress?: ProgressMap } | undefined)?.progress ?? {}) as ProgressMap
    const local = getLocalProgress()

    if (hasEntries(remote)) {
      clearLocalProgress()
      applyProgress(remote)
      return
    }
    if (!hasEntries(local)) return
    applyProgress(local)
    saveRecord({ userId, key: PROGRESS_KEY, data: { progress: local } })
      .then(clearLocalProgress)
      .catch(() => {})
  }, [userId, record.isSuccess, record.isError, record.error, record.data, applyProgress, saveRecord])

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const token = await googleLogin({ platformId: 'google', data: { platform_token: idToken } })
      user.signIn(token)
      pendingSyncRef.current = true
      setUserId(token.user_id!)
    },
    [googleLogin, user]
  )

  const signOut = useCallback(() => {
    user.signOut()
    endSession()
  }, [user, endSession])

  const recordCompletion = useCallback(
    (id: string, timeMs: number): LevelProgress => {
      const next = withCompletion(progressRef.current, id, timeMs)
      applyProgress(next)
      if (userId) {
        // keep the result locally if AGS can't be reached
        saveRecord({ userId, key: PROGRESS_KEY, data: { progress: next } }).catch(() =>
          setLocalProgress(mergeProgress(getLocalProgress(), next))
        )
      } else {
        setLocalProgress(next)
      }
      return next[id]
    },
    [applyProgress, saveRecord, userId]
  )

  const value = useMemo(
    () => ({ progress, signedIn: userId !== null, signInWithGoogle, signOut, recordCompletion }),
    [progress, userId, signInWithGoogle, signOut, recordCompletion]
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProgressStateProvider>{children}</ProgressStateProvider>
    </QueryClientProvider>
  )
}

export function useProgress(): ProgressState {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('useProgress must be used within a ProgressProvider')
  return context
}
