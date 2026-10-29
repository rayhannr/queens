import type { AccelByteSDK } from '@accelbyte/sdk'
import { UsersApi } from '@accelbyte/sdk-iam'

// See specs/auth.md for how these two IDs decide which account a browser plays as.
const DEVICE_ID_KEY = 'queens:deviceId'
const GOOGLE_DEVICE_ID_KEY = 'queens:googleDeviceId'

const newDeviceId = () => crypto.randomUUID().replaceAll('-', '')

/** This browser's own device ID, created on first use. */
export function getDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  return resetDeviceId()
}

export function resetDeviceId(): string {
  const id = newDeviceId()
  window.localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export const getGoogleDeviceId = () => window.localStorage.getItem(GOOGLE_DEVICE_ID_KEY)

export const setGoogleDeviceId = (id: string) => window.localStorage.setItem(GOOGLE_DEVICE_ID_KEY, id)

export const clearGoogleDeviceId = () => window.localStorage.removeItem(GOOGLE_DEVICE_ID_KEY)

/** The device ID this browser logs in with: a Google switch overrides its own. */
export const getActiveDeviceId = () => getGoogleDeviceId() ?? getDeviceId()

export const isGoogleNotLinked = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error === 'platform_not_linked'

export const isNotFound = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status === 404

/**
 * The Google account user's device ID, linking a new one when it has none (accounts created by the
 * Google-only login before device accounts). Runs with that user's own token, outside the session's hooks.
 */
export async function getOrLinkDeviceId(sdk: AccelByteSDK, userId: string): Promise<string> {
  const { data } = await UsersApi(sdk).getPlatforms_ByUserId_v3(userId, { platformId: 'device' })
  const existing = data.data.find(platform => platform.platformId === 'device')?.platformUserId
  if (existing) return existing

  const id = newDeviceId()
  await UsersApi(sdk).postUserMePlatform_ByPlatformId_v3('device', { ticket: id })
  return id
}
