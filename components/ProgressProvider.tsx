'use client'

import {
  usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey,
  usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation
} from '@accelbyte/sdk-cloudsave/react-query'
import {
  useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3,
  useUsersApi_GetPlatforms_ByUserId_v3,
  useUsersApi_PostUserMePlatform_ByPlatformIdMutation_v3
} from '@accelbyte/sdk-iam/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  clearGoogleDeviceId,
  getActiveDeviceId,
  getGoogleDeviceId,
  getOrLinkDeviceId,
  isGoogleNotLinked,
  isNotFound,
  resetDeviceId,
  setGoogleDeviceId
} from '@/lib/ags/account'
import { createLoginSdk, createTokenSdk, createUserSdk, PROGRESS_KEY } from '@/lib/ags/client'
import {
  clearLocalProgress,
  getLocalProgress,
  mergeProgress,
  setLocalProgress,
  withCompletion,
  type LevelProgress,
  type ProgressMap
} from '@/lib/progress'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

/** linked: Google now points at this account; switched: this browser moved to the Google account's. */
export type GoogleOutcome = 'linked' | 'switched'

interface ProgressState {
  progress: ProgressMap
  status: ConnectionStatus
  googleLinked: boolean
  signInWithGoogle: (idToken: string) => Promise<GoogleOutcome>
  signOut: () => void
  recordCompletion: (id: string, timeMs: number) => LevelProgress
}

const queryClient = new QueryClient()
const loginSdk = createLoginSdk()

const ProgressContext = createContext<ProgressState | null>(null)

const improvesOn = (merged: ProgressMap, base: ProgressMap) =>
  Object.entries(merged).some(([id, entry]) => base[id]?.bestTimeMs !== entry.bestTimeMs)

function ProgressStateProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressMap>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loginFailed, setLoginFailed] = useState(false)
  // progress to merge into the account's record once it has loaded after a login; set alongside
  // userId, whose change is what re-runs the sync effect
  const pendingSyncRef = useRef<ProgressMap | null>(null)
  // an expired session drops the user, which logs in again with the device ID below
  const [user] = useState(() => createUserSdk(() => setUserId(null)))

  const { mutateAsync: grantToken } = useOAuth20Api_PostTokenOauth_ByPlatformIdMutation_v3(loginSdk)
  const { mutateAsync: linkPlatform } = useUsersApi_PostUserMePlatform_ByPlatformIdMutation_v3(user.sdk)
  const { mutateAsync: saveRecord } = usePublicPlayerRecordApi_UpdateRecord_ByUserId_ByKeyMutation(user.sdk)

  const record = usePublicPlayerRecordApi_GetRecord_ByUserId_ByKey(
    user.sdk,
    { userId: userId ?? '', key: PROGRESS_KEY },
    { enabled: userId !== null, retry: false }
  )
  const googlePlatforms = useUsersApi_GetPlatforms_ByUserId_v3(
    user.sdk,
    { userId: userId ?? '', queryParams: { platformId: 'google' } },
    { enabled: userId !== null }
  )
  const googleLinked = googlePlatforms.data?.data.some(platform => platform.platformId === 'google') ?? false

  let status: ConnectionStatus = 'connecting'
  if (loginFailed || googlePlatforms.isError) status = 'offline'
  else if (userId && googlePlatforms.isSuccess) status = 'online'

  useEffect(() => setProgress(getLocalProgress()), [])

  const progressRef = useRef(progress)
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  // Covers the first load, sign-out, and an expired session.
  useEffect(() => {
    if (userId || loginFailed) return
    grantToken({ platformId: 'device', data: { device_id: getActiveDeviceId() } })
      .then(token => {
        user.signIn(token)
        pendingSyncRef.current = {}
        setUserId(token.user_id!)
      })
      // the game keeps working on localStorage progress alone
      .catch(() => setLoginFailed(true))
  }, [userId, loginFailed, grantToken, user])

  // Once the record is fetched, merge in the pending progress plus anything left in localStorage (from
  // before device accounts, or saved while AGS was unreachable).
  useEffect(() => {
    const pending = pendingSyncRef.current
    if (!userId || !pending || record.isFetching) return
    const missing = record.isError && isNotFound(record.error)
    if (!record.isSuccess && !missing) return
    pendingSyncRef.current = null

    const remote = ((record.data?.value as { progress?: ProgressMap } | undefined)?.progress ?? {}) as ProgressMap
    const merged = mergeProgress(mergeProgress(remote, pending), getLocalProgress())
    setProgress(merged)
    if (improvesOn(merged, remote)) {
      saveRecord({ userId, key: PROGRESS_KEY, data: { progress: merged } }).then(clearLocalProgress, () => setLocalProgress(merged))
    }
  }, [userId, record.isFetching, record.isSuccess, record.isError, record.error, record.data, saveRecord])

  const signInWithGoogle = async (idToken: string): Promise<GoogleOutcome> => {
    let token
    try {
      // createHeadless=false makes IAM report an unowned Google account instead of creating a user for it
      token = await grantToken({ platformId: 'google', data: { platform_token: idToken, createHeadless: false } })
    } catch (error) {
      if (!isGoogleNotLinked(error) || !userId) throw error
      await linkPlatform({ platformId: 'google', data: { ticket: idToken } })
      await googlePlatforms.refetch()
      return 'linked'
    }

    const googleUserId = token.user_id!
    if (googleUserId === userId) {
      await googlePlatforms.refetch()
      return 'linked'
    }

    setGoogleDeviceId(await getOrLinkDeviceId(createTokenSdk(token.access_token), googleUserId))
    user.signIn(token)
    pendingSyncRef.current = progress
    setUserId(googleUserId)
    return 'switched'
  }

  const signOut = () => {
    // A Google link on this browser's own device ID stays with that account; start a fresh guest.
    if (getGoogleDeviceId()) clearGoogleDeviceId()
    else resetDeviceId()
    user.signOut()
    setProgress(getLocalProgress())
    setUserId(null)
  }

  // Stable across progress changes: Board re-runs its finish effect whenever this changes.
  const recordCompletion = useCallback(
    (id: string, timeMs: number): LevelProgress => {
      const next = withCompletion(progressRef.current, id, timeMs)
      setProgress(next)
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
    [userId, saveRecord]
  )

  return (
    <ProgressContext.Provider value={{ progress, status, googleLinked, signInWithGoogle, signOut, recordCompletion }}>
      {children}
    </ProgressContext.Provider>
  )
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
