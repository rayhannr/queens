# Auth: device accounts with Google linking

Status: accepted, implementation in progress (decided 2026-10-29)

## Problem

Today a player only gets an AGS session by signing in with Google, and tokens live in memory, so every
reload logs them out. Players who never sign in have no account and keep progress only in localStorage.

## Decision

Every browser plays as an AGS **device account**. We persist a device ID, never a token, and log in with
it on every load. Signing in with Google links Google to an account in IAM. It is not a separate session.

## Verified IAM facts (game namespace, checked 2026-10-29)

- The `device` login platform is enabled. `POST /iam/v3/oauth/platforms/device/token` with `device_id`
  creates the user on first use and logs in to the same user afterwards.
- `GET /iam/v3/public/namespaces/{ns}/users/{userId}/platforms` returns a device link as
  `platformId: "device"`, with the raw device ID in `platformUserId`. This lets us adopt another
  user's device ID.
- The `google` platform token grant with `createHeadless=false` fails with `platform_not_linked` when no
  user owns the Google account.
- A user holds at most one Google link and at most one device link.
- A player can link a device ID to themselves with `POST /iam/v3/public/namespaces/{ns}/users/me/platforms/device`
  and `ticket=<device ID>`. It returns 204, or 409 (error code 10163) if the user already has a device
  link. Afterwards, the device grant with that ID logs in to that user.

## Browser storage

| Key | Value | Lifetime |
|---|---|---|
| `queens:deviceId` | This browser's own device ID: `crypto.randomUUID()` without dashes (32 hex chars) | Created once. Replaced only in the sign-out case below. |
| `queens:googleDeviceId` | The device ID of another user we switched to through Google (adopted, or newly linked to that user) | Set by a Google switch, cleared by sign-out |
| `queens:progress` | Offline fallback for progress (existing key) | Unchanged |

No access or refresh token is persisted.

## Behaviour

### Load

1. If `queens:deviceId` is missing, generate it.
2. Log in with the device grant using `queens:googleDeviceId ?? queens:deviceId`.
3. One-time migration: if `queens:progress` holds entries from before this change, merge them into
   the account's Cloud Save record.
4. If AGS is unreachable, the game keeps working on `queens:progress` alone.

### Continue with Google

Run the Google platform token grant with `createHeadless=false`.

| Result | Action | Progress |
|---|---|---|
| `platform_not_linked` | Link Google to the current account | Stays where it is |
| Owned by user X, X has a `device` link | Set `queens:googleDeviceId` to X's device ID and log in as X | Merge the current account's progress into X |
| Owned by user X, X has no `device` link | Generate a new device ID, link it to X using X's token, then continue as in the row above | Merge the current account's progress into X |

The last row covers Google accounts created by the Google-only login used before device accounts.
Their first sign-in gives them a device ID, and from then on they behave like any other account. The
goal is that a Google account's progress follows it to every device, in both directions.

### Sign out

Only shown when the current account has a Google link.

- If `queens:googleDeviceId` is set, clear it and log in with `queens:deviceId`.
- Otherwise the Google link sits on this browser's own device account. Generate a new
  `queens:deviceId` and log in with it. The old account keeps its Google and device links, so
  continuing with that Google account later switches back to it through the second row of the table
  above.

Sign-out never unlinks Google, because unlinking would strand that account's progress where Google
can no longer reach it.

### Signed-in state

"Signed in" means the current account has a `google` platform link, checked through the platforms
endpoint after login. This survives reloads without the GSI `auto_select` prompt, which is removed.

## Invariants

- A Google account's progress is never deleted or overwritten. Every write to it is a merge.
- Merging keeps the best time per level (`mergeProgress`), so a merge never makes a record worse.
- A reload never changes which account the browser is on.

## Accepted trade-offs

- The stored device ID works as a permanent credential. After a Google switch it opens that Google
  user's account without Google. This is acceptable for a puzzle game.
- Abandoned guest accounts (left behind by a switch or by sign-out) stay in IAM.

## Acceptance scenarios

1. A first visit, then a reload: same user ID both times, with no prompt.
2. A guest completes levels, then continues with an unlinked Google account: same user ID, the Google
   link is shown, and progress is unchanged.
3. Browser B continues with a Google account that browser A linked: B's `queens:googleDeviceId` is
   set to A's `queens:deviceId`, B's progress is merged into A's account, and B's reload stays on A's
   account. No new link is created. Both browsers log in with the same device ID, which is still
   linked only to A's account, and B's own `queens:deviceId` stays linked to B's guest.
4. Continuing with a Google account whose user has no device link: that user gains a device link, this
   browser's `queens:googleDeviceId` is set to it, and the browser is now on that user with both sets
   of progress merged. Progress made afterwards shows up when the same Google account is used on
   another device.
5. Sign out after scenario 3: B is back on its own guest, and continuing with the same Google
   account switches it back.
6. Sign out after scenario 2: `queens:deviceId` changes, then continuing with the same Google account
   returns to the original user with its progress intact.
7. Sign out, then continue with a different, unlinked Google account: it links to the new guest
   without error.
