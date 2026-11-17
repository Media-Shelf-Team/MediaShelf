# Media Shelf Cloud Functions

Reference for everything in `functions/`: what each function does, what each
file is for, and how they fit into the rest of Media Shelf.

## Where this fits

Media Shelf has three server-side pieces:

| Piece                                        | Responsible for                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Firebase Auth                                | Emails and passwords. Emails are never copied to Firestore.                                                                       |
| Firestore Security Rules (`firestore.rules`) | What the browser may read and edit directly: profile fields, bio, a log's status, rating, date and notes, deleting a log.         |
| Cloud Functions (this folder)                | Everything the browser isn't trusted to do: creating profiles, calling the media APIs, adding logs, cleaning up deleted accounts. |

The functions use the Admin SDK, which skips Security Rules. That is why they
repeat the rules' checks in `lib/validate.js`, take the user's identity only
from the auth token, and write only under the caller's own `users/{uid}`.

```
Browser (js/)  ──calls──▶  index.js ──▶ lib/      ──▶ Firestore
                                    └─▶ adapters/ ──▶ TMDB, Open Library, IGDB, MusicBrainz
Firebase Auth ──account deleted──▶ index.js (onUserDeleted)
```

## File layout

```
functions/
├── index.js              The four functions, plus shared setup
├── lib/
│   ├── validate.js       Input checks and result cleanup
│   ├── http.js           Fetch helper for the external APIs
│   ├── rateLimit.js      Shared 45/min-per-API limit
│   └── cache.js          searchCache and apiCache
├── adapters/
│   ├── tmdb.js           Movies, TV shows (+ director/creator lookup)
│   ├── openlibrary.js    Books
│   ├── igdb.js           Video games
│   └── musicbrainz.js    Music tracks
├── package.json
└── .secret.local         Emulator secrets (git-ignored, you create it)
```

---

## The functions

All callable functions (the first three) require a valid Firebase App Check
token and a signed-in user. Errors are `HttpsError`s; when two errors share a
code, `err.details.reason` tells them apart.

### `createUserProfile`

Called once by `signup.js` right after the Auth account is created.

- **Request:** `{username, avatarId}`
  - `username` must match `^[a-z0-9_]{3,30}$`. The client lowercases it; the
    server rejects anything else rather than changing it.
  - `avatarId` must be `avatar1`, `avatar2`, `avatar3` or `avatar4`.
- **Returns:** `{username}`
- **What it does:** in one transaction, checks that the username is free and
  the user has no profile yet, then creates:

  | Document                      | Contents                                             |
  | ----------------------------- | ---------------------------------------------------- |
  | `usernames/{username}`        | `{uid}`                                              |
  | `users/{uid}`                 | `{displayName: username, avatarId, isPublic: false}` |
  | `users/{uid}/profile/details` | `{bio: ''}`                                          |
  | `users/{uid}/private/account` | `{username}`                                         |

  All four use `create()`, so nothing can be overwritten, and two sign-ups
  racing for the same name can't both succeed.

| Code               | Reason           | When                                                         |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| `unauthenticated`  |                  | Not signed in                                                |
| `invalid-argument` |                  | Extra fields, bad username or avatar                         |
| `already-exists`   | `username-taken` | Name already reserved. The client deletes the new Auth user. |
| `already-exists`   | `profile-exists` | This account already has a profile                           |

### `searchMedia`

Called by `js/media/search.js` when the user searches a category.

- **Request:** `{category, query}`
  - `category`: `movie`, `show` (TV shows), `book`, `game` or `music`
  - `query`: 1–100 characters after trimming, collapsing spaces and
    lowercasing
- **Returns:**
  `{results: [{externalId, title, creator, year, coverImageUrl}], fromCache}`, up
  to 10 results. An empty array means "No results found". `creator` is the
  first author (books), developer (games) or artist (music), or `null`. It
  is always `null` for movies and shows, because TMDB's search doesn't
  include it; `addMediaEntry` looks it up instead.
- **What it does:**
  1. Returns the `searchCache` entry for this category and text if it hasn't
     expired. No API call is made.
  2. Otherwise takes a slot from the rate limiter, calls the category's
     adapter, and drops any results with a bad ID or no title.
  3. If there are results, saves them to `searchCache` and each title to
     `apiCache` for 30 days. Empty results are not cached. If saving fails,
     the error is logged and the results are still returned. The `apiCache`
     write merges, so it never erases a movie or show creator that
     `addMediaEntry` already looked up.

| Code                 | When                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `unauthenticated`    | Not signed in                                                                                                             |
| `invalid-argument`   | Extra fields, unknown category, search text empty or too long                                                             |
| `resource-exhausted` | "Too many requests, try again shortly." Our 45/min cap, MusicBrainz's 1/sec rule, or the API's own rate limit (HTTP 429). |
| `unavailable`        | "Search is unavailable right now, try again shortly." The API is down, timed out (8 s) or returned bad data.              |

### `addMediaEntry`

Called by `js/media/entries.js` when the user clicks Add on a search result.

- **Request:** `{category, externalId, status, rating?, date?, notes?}`
  - `externalId`: the `externalId` from a `searchMedia` result
  - `status`: `completed`, `in_progress` or `planned`
  - `rating` (optional): a whole number 1–5, or `null`. Left out = `null`
    (not rated).
  - `date` (optional): the day it was watched/read/played, `YYYY-MM-DD`. It
    must be a real day and not in the future; up to one day past today's UTC
    date is allowed, so users east of UTC can log their own "today". Left out
    = today's UTC date. The browser sends the user's local date.
  - `notes` (optional): up to 500 characters. Left out = `''`.
  - `creator` can't be sent; the server sets it.
- **Returns:** `{id, category, source, externalId, title, creator,
coverImageUrl, status, rating, date, notes}`. `createdAt` isn't returned
  because it is set by the server clock during the write.
- **What it does:**
  1. Checks the request.
  2. Movies and shows only: if the title's `apiCache` entry has no `creator`
     field yet, looks it up from TMDB (first director in the movie's credits,
     or first name in the show's "created by" list). The lookup takes a slot
     from the TMDB rate limit, and the result (a name, or `null` if TMDB
     lists none) is saved to `apiCache`, so each title is looked up once and
     reused by every user. **The lookup never stops the add:** if TMDB is
     down, the rate limit is used up, or anything else fails, the log is
     saved with `creator: null`, and the failure isn't cached, so the next
     add tries again. This happens before the transaction, because a
     transaction can run more than once.
  3. In one transaction, checks in this order that:
     1. the user has a `users/{uid}` profile
     2. the title isn't already in the collection (checked before the cache,
        so a duplicate never asks the user to search again)
     3. the title has a fresh `apiCache` entry

     then creates `users/{uid}/mediaEntries/{category}_{externalId}` with the
     title, creator and cover from `apiCache` (never from the client), the
     user's status, rating, date and notes, and `createdAt` set from the
     server clock. Two clicks on Add can't both succeed.

| Code                  | Reason                  | When                                                                             |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `unauthenticated`     |                         | Not signed in                                                                    |
| `invalid-argument`    |                         | Extra fields, unknown category, bad ID, status, rating, date or notes            |
| `failed-precondition` | `no-profile`            | No `users/{uid}` document                                                        |
| `already-exists`      | `already-in-collection` | "Already in your collection"                                                     |
| `failed-precondition` | `search-again`          | Title not in `apiCache`, or its entry expired. The client runs the search again. |

Editing a log's status, rating, date or notes, and deleting a log, don't use
a function. The browser writes Firestore directly, and the Security Rules
allow only those changes (with the same checks as above).

### `onUserDeleted`

Not called by the client. Runs automatically when a Firebase Auth account is
deleted. The Settings page re-authenticates the user and deletes the Auth
account; this function does the rest.

- **What it does:**
  1. Finds every `usernames` document whose `uid` is the deleted user and
     deletes it, so the name can be used again right away.
  2. Deletes `users/{uid}` and all its subcollections (`profile/details`,
     `private/account`, `mediaEntries`) with `recursiveDelete`.
- **Retries:** on. Every step is safe to repeat, so a failed run is delivered
  again until it succeeds.
- **Limits:** Auth triggers only fire for accounts deleted one at a time, not
  bulk deletes (Admin SDK `deleteUsers`). It uses the v2 identity trigger,
  which is marked beta in `firebase-functions` 7.4.0.

---

## The files

### `index.js`

The entry point Firebase loads. Besides the four functions above, it holds
the shared setup:

| Part                                                      | What it does                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setGlobalOptions({maxInstances: 10})`                    | Caps containers per function for cost control.                                                                                                       |
| `initializeApp()`, `db`                                   | Starts the Admin SDK and the Firestore handle every function shares. No config needed: the project and credentials come from the environment.        |
| `TMDB_READ_TOKEN`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` | Secret Manager secrets, read with `.value()` inside `searchMedia`, and `TMDB_READ_TOKEN` inside `addMediaEntry` for the creator lookup.              |
| `ADAPTERS`                                                | Maps each category to its adapter: `movie`/`show` → TMDB, `book` → Open Library, `game` → IGDB, `music` → MusicBrainz.                               |
| `lookUpTmdbCreator(category, externalId)`                 | Used by `addMediaEntry`: rate limit + `tmdb.lookupCreator` + save to `apiCache`. Returns the name or `null`, and never throws.                       |
| `SEARCH_RESULT_LIMIT`                                     | 10 results per search.                                                                                                                               |
| `error(code, message, reason)`                            | Builds an `HttpsError`, putting `reason` in `details`.                                                                                               |
| `callable(options, handler)`                              | Wraps `onCall` with `enforceAppCheck: true`, rejects signed-out callers, and passes the handler `(uid, data)` with the uid from the auth token only. |

### `lib/validate.js`

The server's copy of the Security Rules checks, plus cleanup of search text
and API results. Values must match `js/constants.js` and `firestore.rules`.

| Export                                                           | What it does                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isValidUsername`                                                | String matching `^[a-z0-9_]{3,30}$`                                                                                                                                                                           |
| `isValidAvatarId`                                                | One of `avatar1`–`avatar4`                                                                                                                                                                                    |
| `isValidCategory`                                                | One of the five categories: `movie`, `show`, `book`, `game`, `music`                                                                                                                                          |
| `isValidStatus`                                                  | `completed`, `in_progress` or `planned`                                                                                                                                                                       |
| `isValidRating`                                                  | `null`, or a whole number 1–5                                                                                                                                                                                 |
| `isValidLogDate`                                                 | A real day written `YYYY-MM-DD`, no later than one day past today's UTC date                                                                                                                                  |
| `isValidNotes`                                                   | A string of up to 500 characters                                                                                                                                                                              |
| `todayUtc()`                                                     | Today's UTC date as `YYYY-MM-DD` (the default log date)                                                                                                                                                       |
| `cleanCreator(value)`                                            | Trims a creator name and cuts it to 300 characters; returns `null` if it's missing or blank                                                                                                                   |
| `isValidExternalId`                                              | String matching `^[A-Za-z0-9-]{1,64}$` (TMDB/IGDB numbers, Open Library `OL…W` keys, MusicBrainz UUIDs). It becomes part of a document ID, so nothing else is allowed.                                        |
| `hasOnlyKeys(value, allowed)`                                    | Non-null object with no keys outside `allowed`                                                                                                                                                                |
| `normalizeQuery(value)`                                          | Trims, collapses whitespace, lowercases; returns null unless 1–100 characters                                                                                                                                 |
| `cleanYear(value)`                                               | Reads the year from an API's release date (`'1999-03-30'`, `'1975'` or `1965`), or returns `null`.                                                                                                            |
| `toMediaResult(externalId, title, coverImageUrl, creator, year)` | Builds one `{externalId, title, creator, year, coverImageUrl}` result, or null if the ID is invalid or the title is empty. Titles are cut to 300 characters; a missing cover, creator or year becomes `null`. |
| `MAX_QUERY_LENGTH`, `MAX_NOTES_LENGTH`                           | 100 and 500, used in error messages                                                                                                                                                                           |

### `lib/http.js`

The only place that makes outside web requests.

- `fetchJson(apiName, url, options)` sends the request with the Media Shelf
  User-Agent (`MediaShelf/1.0 (https://github.com/Media-Shelf-Team/MediaShelf)`,
  which MusicBrainz and Open Library ask for) and an 8-second timeout, and
  returns the parsed JSON.
- Any failure is logged and turned into the error the user sees: HTTP 429 →
  `resource-exhausted`, anything else (network error, timeout, other status,
  bad JSON) → `unavailable`.
- Exports `TOO_MANY_REQUESTS`, the shared "Too many requests, try again
  shortly." message.

### `lib/rateLimit.js`

Keeps calls within the free API tiers, as PRD section 7 requires.

- `consumeRateLimit(db, apiName)` takes one slot or throws
  `resource-exhausted`.
- Stored in `rateLimits/{apiName}` as `{windowStart, count, lastCallAt}`
  (milliseconds) and updated in a transaction, so two calls can't take the
  last slot.
- 45 calls per calendar minute per API, shared by all users. MusicBrainz also
  allows only one call per second; a second call within the same second gets
  the error rather than waiting.
- Twitch token requests (for IGDB) aren't counted, because they go to Twitch,
  not IGDB.

### `lib/cache.js`

The two server-only caches. Entries last 30 days; `expiresAt` is checked on
every read.

| Collection    | Document ID                                 | Contents                                                                   |
| ------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| `searchCache` | SHA-256 of category + search text           | `{category, query, results, expiresAt}`                                    |
| `apiCache`    | `{category}_{externalId}`, e.g. `movie_603` | `{category, source, externalId, title, creator, coverImageUrl, expiresAt}` |

`creator` in `apiCache`: books, games and music get it from the search. For
movies and shows the field is missing until `addMediaEntry` looks it up; after
that it holds the name, or `null` if TMDB lists nobody.

| Export                                             | What it does                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCachedSearch(db, category, query)`             | Cached results, or null if missing or expired                                                                                                              |
| `saveSearch(db, category, source, query, results)` | Writes `searchCache` and one `apiCache` document per result in one batch. The `apiCache` writes merge and only include `creator` when the search gave one. |
| `saveCreator(db, category, externalId, creator)`   | Saves a looked-up movie/show creator to the title's `apiCache` document                                                                                    |
| `apiCacheRef(db, category, externalId)`            | Reference to a title's `apiCache` document (used by `addMediaEntry`)                                                                                       |
| `isFresh(data)`                                    | True if a cache document exists and hasn't expired                                                                                                         |

### `adapters/`

One file per API. Each exports `{name, search}` (TMDB also exports
`lookupCreator`):

- `name` is the API's name, used for the rate limit (`rateLimits/{name}`) and
  stored as the log's `source`.
- `search(category, query, limit, secrets)` returns an array of results built
  with `toMediaResult`. Invalid entries come back as `null`, and `searchMedia`
  drops them and keeps the first 10.
- `tmdb.lookupCreator(category, externalId, secrets)` returns a movie's first
  director or a show's first creator, or `null`. It throws if TMDB can't be
  reached; `addMediaEntry` catches that.

If a provider changes its API, only its adapter changes.

| File             | API                                                                                                                                     | Request | ID  | Cover |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ----- |
| File             | Creator                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------                          |
| `tmdb.js`        | Not in search. `lookupCreator`: `GET /3/movie/{id}/credits` (first `crew` with job `Director`) or `GET /3/tv/{id}` (first `created_by`) |
| `openlibrary.js` | First `author_name`                                                                                                                     |
| `igdb.js`        | First `involved_companies` entry with `developer: true` → `company.name`                                                                |
| `musicbrainz.js` | First `artist-credit` entry's `name`                                                                                                    |

| File             | API          | Request                                                                                                                                 | ID                                | Cover                                                                  |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `tmdb.js`        | TMDB         | `GET /3/search/movie` or `/3/search/tv`, Bearer `TMDB_READ_TOKEN`                                                                       | `id`                              | `https://image.tmdb.org/t/p/w500{poster_path}`                         |
| `openlibrary.js` | Open Library | `GET /search.json?title=…&fields=key,title,cover_i,author_name`                                                                         | `OL…W` from `key` (`/works/OL…W`) | `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`                  |
| `igdb.js`        | IGDB         | `POST /v4/games`, body `search "…"; fields name,cover.image_id,involved_companies.company.name,involved_companies.developer; limit 10;` | `id`                              | `https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg` |
| `musicbrainz.js` | MusicBrainz  | `GET /ws/2/recording?query=recording:"…"`                                                                                               | recording UUID                    | `https://coverartarchive.org/release/{id}/front-250`                   |

Per-adapter details:

- **TMDB:** movies use `title`, TV shows use `name`. Our `show` category maps
  to TMDB's `tv` endpoints (`TMDB_TYPES` in `tmdb.js`).
- **Open Library:** no key.
- **IGDB:** fetches a Twitch app token with the client ID and secret (sent in
  the request body, not the URL) and keeps it in memory until a minute before
  it expires. If an IGDB call fails, the token is dropped so the next search
  gets a fresh one. Quotes and backslashes are removed from the search text so
  it can't break out of the query string.
- **MusicBrainz:** no key. Only the track title is kept, as the PRD says. The
  cover comes from the track's most recent release; the URL isn't checked, so
  the frontend shows a placeholder if the image fails to load. Quotes and
  backslashes in the search text are escaped.

---

## Firestore documents the functions touch

| Path                            | Written by                                                                    | Notes                                                              |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `usernames/{username}`          | `createUserProfile`; deleted by `onUserDeleted`                               | Server-only                                                        |
| `users/{uid}`                   | `createUserProfile`; deleted by `onUserDeleted`                               | Owner can then edit `displayName`, `avatarId`, `isPublic`          |
| `users/{uid}/profile/details`   | `createUserProfile`; deleted by `onUserDeleted`                               | Owner can then edit `bio`                                          |
| `users/{uid}/private/account`   | `createUserProfile`; deleted by `onUserDeleted`                               | No client writes                                                   |
| `users/{uid}/mediaEntries/{id}` | `addMediaEntry`; deleted by `onUserDeleted`                                   | Owner can then edit `status`, `rating`, `date`, `notes`, or delete |
| `searchCache/{hash}`            | `searchMedia`                                                                 | Server-only                                                        |
| `apiCache/{category}_{id}`      | `searchMedia`; read by `addMediaEntry`, which also saves movie/show `creator` | Server-only                                                        |
| `rateLimits/{apiName}`          | `searchMedia` and the `addMediaEntry` creator lookup (via `rateLimit.js`)     | Server-only                                                        |

## Setup

**Secrets** (create once per project):

```
firebase functions:secrets:set TMDB_READ_TOKEN      # TMDB "API Read Access Token", not the v3 key
firebase functions:secrets:set IGDB_CLIENT_ID       # Twitch app client ID
firebase functions:secrets:set IGDB_CLIENT_SECRET   # Twitch app client secret
```

For the emulator, put the same values in `functions/.secret.local`, which is
git-ignored:

```
TMDB_READ_TOKEN=...
IGDB_CLIENT_ID=...
IGDB_CLIENT_SECRET=...
```

**Optional:** a Firestore TTL policy on `expiresAt` for `searchCache` and
`apiCache` deletes expired entries automatically. The code checks
`expiresAt` either way.

**Before merging:** CI runs `npm run lint --prefix functions` and
`npm run format:check` (Prettier) on every pull request.

## Testing a function locally

With `firebase emulators:start --only firestore` running, a scratch script in
`functions/` can call a handler directly. `.run()` skips App Check, which is
fine for local tests. Keep the script out of commits.

```js
const f = require('./index.js');
f.createUserProfile
  .run({auth: {uid: 'u1'}, data: {username: 'jordan_w', avatarId: 'avatar2'}})
  .then(console.log, (e) => console.log(e.code, e.details));
```

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=media-shelf-d46e7 node try.js
```

## Keeping copies in sync

These values exist in more than one place, because `firestore.rules` can't
import files and the deploy only uploads `functions/`:

| Value            | `lib/validate.js` | `js/constants.js` | `firestore.rules` |
| ---------------- | ----------------- | ----------------- | ----------------- |
| Username pattern | ✓                 | ✓                 |                   |
| Avatar IDs       | ✓                 | ✓                 | ✓                 |
| Categories       | ✓                 | ✓                 |                   |
| Statuses         | ✓                 | ✓                 | ✓                 |
| Rating 1–5       | ✓                 | ✓                 | ✓                 |
| Log date rule    | ✓                 | ✓ (format only)   | ✓                 |
| Notes max 500    | ✓                 | ✓                 | ✓                 |

Change them together, in the same pull request.

## Still to do on the client

- `signup.js`: send the picked avatar (`avatar1`–`avatar4`) and call
  `createUserProfile`; on `username-taken`, delete the new Auth user.
- `js/media/search.js`: call `searchMedia`; show "No results found for
  '…'" on an empty array and the error message on `resource-exhausted` or
  `unavailable`.
- `js/media/entries.js`: call `addMediaEntry` with the Log Media modal's
  values (rating as a number or `null`, the local date, notes); handle
  `already-in-collection`, `search-again` and `no-profile`.
- Editing a log: update `status`, `rating`, `date` and `notes` directly in
  Firestore.
- Settings: wire up the Delete account section (re-authenticate with the
  password, then delete the Auth account).
