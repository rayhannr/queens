import { AccelByte, createAuthInterceptor } from '@accelbyte/sdk'

export const PROGRESS_KEY = 'queensProgress'

const baseURL = process.env.NEXT_PUBLIC_ACCELBYTE_BASE_URL!
const namespace = process.env.NEXT_PUBLIC_ACCELBYTE_NAMESPACE!
const clientId = process.env.NEXT_PUBLIC_ACCELBYTE_CLIENT_ID!

const coreConfig = { baseURL, clientId, namespace, redirectURI: baseURL }

// Token endpoints authenticate the public game client with its id and an empty secret.
export const createLoginSdk = () =>
  AccelByte.SDK({
    coreConfig,
    axiosConfig: { request: { withCredentials: true, headers: { Authorization: `Basic ${btoa(`${clientId}:`)}` } } }
  })

export const createUserSdk = (onSessionExpired: () => void) =>
  AccelByte.SDK({
    coreConfig,
    axiosConfig: {
      request: { withCredentials: true },
      interceptors: [createAuthInterceptor({ clientId, onSessionExpired })]
    }
  })
