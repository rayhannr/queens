'use client'

import {
  usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey,
  usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation
} from '@accelbyte/sdk-cloudsave/react-query'
import {
  Key_Users,
  useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3,
  useOAuth20ExtensionApi_CreateLogoutMutation_v3,
  useUsersApi_GetUsersMe_v3
} from '@accelbyte/sdk-iam/react-query'
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
  const progressRef = useRef<ProgressMap>({})
  // consumed once the account's record has loaded; accountWins is set for a fresh sign-in
  const pendingSyncRef = useRef<{ accountWins: boolean } | null>({ accountWins: false })

  const applyProgress = useCallback((map: ProgressMap) => {
    progressRef.current = map
    setProgress(map)
  }, [])

  const endSession = useCallback(() => {
    queryClient.setQueryData([Key_Users.UsersMe_v3, {}], null)
    pendingSyncRef.current = null
    applyProgress(getLocalProgress())
  }, [applyProgress])

  const loginSdk = useMemo(createLoginSdk, [])
  const sdk = useMemo(() => createUserSdk(endSession), [endSession])

  const { mutateAsync: googleLogin } = useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3(loginSdk)
  const { mutateAsync: logout } = useOAuth20ExtensionApi_CreateLogoutMutation_v3(sdk)
  const { data: user, refetch: refetchUser } = useUsersApi_GetUsersMe_v3(sdk, {}, { retry: false, staleTime: Infinity })
  const userId = user?.userId ?? null

  const record = usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey(
    sdk,
    { userId: userId ?? '', key: PROGRESS_KEY },
    { enabled: userId !== null, retry: false, staleTime: Infinity }
  )
  const { mutateAsync: saveRecord } = usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation(sdk)

  useEffect(() => applyProgress(getLocalProgress()), [applyProgress])

  // On a fresh sign-in the account's progress wins over this device's; otherwise the two are merged.
  // Local progress is only cleared once AGS has accepted the upload.
  useEffect(() => {
    const pending = pendingSyncRef.current
    if (!userId || !pending) return
    const missing = record.isError && isNotFound(record.error)
    if (!record.isSuccess && !missing) return
    pendingSyncRef.current = null

    const remote = ((record.data?.value as { progress?: ProgressMap } | undefined)?.progress ?? {}) as ProgressMap
    const local = getLocalProgress()

    if (pending.accountWins && hasEntries(remote)) {
      clearLocalProgress()
      applyProgress(remote)
      return
    }
    if (!hasEntries(local)) {
      applyProgress(remote)
      return
    }
    const merged = mergeProgress(remote, local)
    applyProgress(merged)
    saveRecord({ userId, key: PROGRESS_KEY, data: { progress: merged } })
      .then(clearLocalProgress)
      .catch(() => {})
  }, [userId, record.isSuccess, record.isError, record.error, record.data, applyProgress, saveRecord])

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      await googleLogin({ platformId: 'google', data: { platform_token: idToken } })
      pendingSyncRef.current = { accountWins: true }
      const result = await refetchUser()
      if (!result.isSuccess) throw result.error
    },
    [googleLogin, refetchUser]
  )

  const signOut = useCallback(() => {
    logout({}).finally(endSession)
  }, [logout, endSession])

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
