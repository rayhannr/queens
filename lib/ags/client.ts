import { AccelByte, createAuthInterceptor } from '@accelbyte/sdk'

export const PROGRESS_KEY = 'queensProgress'

const baseURL = process.env.NEXT_PUBLIC_ACCELBYTE_BASE_URL!
const namespace = process.env.NEXT_PUBLIC_ACCELBYTE_NAMESPACE!
const clientId = process.env.NEXT_PUBLIC_ACCELBYTE_CLIENT_ID!

const coreConfig = { baseURL, clientId, namespace, redirectURI: baseURL }

// Token endpoints authenticate the public game client with its id and an empty secret.
export const createLoginSdk = () =>
  AccelByte.SDK({ coreConfig, axiosConfig: { request: { headers: { Authorization: `Basic ${btoa(`${clientId}:`)}` } } } })

export interface LoginToken {
  access_token: string
  refresh_token?: string | null
  user_id?: string | null
}

// For one-off reads as another user (e.g. the Google account's record) without touching the session.
export const createTokenSdk = (accessToken: string) => {
  const sdk = AccelByte.SDK({ coreConfig })
  sdk.setToken({ accessToken })
  return sdk
}

// Tokens are kept in memory only; the auth interceptor renews an expired access token with the refresh token.
export const createUserSdk = (onSessionExpired: () => void) => {
  let refreshToken: string | undefined

  const sdk = AccelByte.SDK({
    coreConfig,
    axiosConfig: {
      interceptors: [
        createAuthInterceptor({
          clientId,
          getRefreshToken: () => refreshToken,
          onGetUserSession: (accessToken, nextRefreshToken) => {
            refreshToken = nextRefreshToken
            sdk.setToken({ accessToken, refreshToken })
          },
          onSessionExpired
        })
      ]
    }
  })

  return {
    sdk,
    signIn: (token: LoginToken) => {
      refreshToken = token.refresh_token ?? undefined
      sdk.setToken({ accessToken: token.access_token, refreshToken })
    },
    signOut: () => {
      refreshToken = undefined
      sdk.removeToken()
    }
  }
}
