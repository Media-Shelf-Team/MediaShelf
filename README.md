# Media Shelf (work in progress)

Media Shelf is a web app for logging movies, TV shows, books, video games, and music in one place. It's built with plain HTML, CSS, and JavaScript ES modules (no bundler), hosted on GitHub Pages, and uses Firebase Authentication, Cloud Firestore, and Cloud Functions.

## Current status

### Done

- [x] Firebase project setup (`.firebaserc`, `firebase.json`) and one shared browser setup in `js/firebase-config.js`, which uses the local emulators on localhost.
- [x] App Check with reCAPTCHA Enterprise (see [App Check](#app-check)).
- [x] Pages: `index`, `login`, `signup`, `forgot-password`, `main-page`, and `about`, with styles in `css/`. Every page shares one look from `css/theme.css` (see [Styles](#styles)). Edit profile and Settings are modals on `main-page` (the old `settings-and-customization` page was removed).
- [x] Email and password sign-up, log-in, log-out, and password reset (see [Authentication](#authentication)).
- [x] MS-11: sign-up calls `createUserProfile` with the username and picked avatar (see [Authentication](#authentication)).
- [x] MS-10: Firestore Security Rules (see [Security Rules](#security-rules)).
- [x] MS-03: Security Rules tests with `npm test` (see [Testing](#testing)).
- [x] Cloud Functions: `createUserProfile`, `searchMedia`, `addMediaEntry`, and `onUserDeleted` (see [Cloud Functions](#cloud-functions)), with tests run by `npm run test:functions`.
- [x] CI: Prettier, ESLint, the rules tests, and the Cloud Functions tests on every pull request into `main`.
- [x] Secret scan on every push and pull request (see [Secret scanning](#secret-scanning)).

### In progress

- [ ] Avatars are `avatar1`–`avatar4` everywhere (rules, functions, `js/constants.js`, sign-up, Edit profile), with pictures in `assets/avatar/avatar1.png`–`avatar4.png`. `avatar1`, `avatar2` and `avatar4` are plain grey placeholders until the real pictures are added, and the Edit profile modal still shows blank circles instead of the pictures.
- [x] My Shelf shows the profile and the shelf from Firestore, and the Log Media modal searches (`searchMedia`) and saves (`addMediaEntry`).
- [x] Clicking a card on the shelf opens the log's details, where it can be edited (status, rating, date, notes) or deleted.
- [ ] The Delete account section in the Settings modal is UI only: the button doesn't do anything yet.
- [ ] "Can't find it? Add manually" in the Log Media modal is hidden for the MVP: `addMediaEntry` only accepts titles from a search, so it needs a new Cloud Function, rules and tests.
- [ ] The Social and Contact pages were removed for the MVP. The Social link in the `main-page.html` nav is kept but `hidden`. Log Out is in the avatar menu on My Shelf.
- [ ] Placeholders: `assets/credits/` doesn't exist yet.

### Next up

- [ ] MS-06: app shell.

## First-time setup

Do this once on each computer.

1. Install **Node.js 24.12 or newer (24.x)** and **Java 21 or newer** (the Firestore emulator needs it). Check with `node -v` and `java -version`.
2. Install the Firebase CLI and sign in. Ask the project owner to add you to the Firebase project first.

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. Clone the repository, then install dependencies from its root:

   ```bash
   npm install
   npm install --prefix functions
   ```

4. Open the folder in VS Code and install the recommended extensions (Prettier and ESLint). Files are then formatted on save.
5. Don't run `firebase init`. The repository is already connected to the project.
6. Register your App Check debug token the first time you run the app in each browser (see [App Check](#app-check)).

## Running the app locally

Run each command in its own terminal at the repository root:

```bash
firebase emulators:start   # Emulator UI at http://localhost:4000

npx serve .                # open the URL it prints
```

On `localhost` or `127.0.0.1`, the app uses the local emulators, so nothing reaches the live Firebase project. The Firestore emulator uses the same `firestore.rules`.

| Emulator       | Port |
| -------------- | ---: |
| Authentication | 9099 |
| Functions      | 5001 |
| Firestore      | 8080 |
| Emulator UI    | 4000 |

In the Emulator UI, use **Authentication** for test users, **Firestore** for data, **Firestore > Requests** to see which rule allowed or denied a request, and **Logs** for function output. Profiles and media entries are created only by Cloud Functions. Until the pages call them, add test documents by hand in the Emulator UI. For `searchMedia` to reach the real APIs locally, add the API keys to `functions/.secret.local` (see [Cloud Functions](#cloud-functions)).

## App Check

App Check proves requests come from the real Media Shelf site. It's set up in `js/firebase-config.js`, and any script that imports from that file gets it automatically.

- It's enforced only on the callable Cloud Functions (`createUserProfile`, `searchMedia`, `addMediaEntry`) with `onCall({enforceAppCheck: true}, ...)`. Firestore is protected by Security Rules instead.
- The reCAPTCHA site key is public by design and only works on its registered domains.

### Register your debug token (each browser)

reCAPTCHA doesn't run on localhost, so local development uses a debug token:

1. Run the app locally and open a page that loads Firebase.
2. In the browser console, copy the value from `Firebase App Check debug token: ...`.
3. In the Firebase console, go to **App Check > Apps > ⋮ > Manage debug tokens**, and add the token with your name and browser (for example, "YourName – laptop Chrome").
4. Reload the page.

Each browser, computer, or private window needs its own token. **Treat a debug token like a password.** If one leaks, delete it and register a new one.

### Settings (admins)

| Setting                       | Where                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| reCAPTCHA key and its domains | Google Cloud console > **Fraud Defense > reCAPTCHA** (Web, score-based, no checkbox) |
| App Check registration        | Firebase console > **App Check > Apps**                                              |
| Debug tokens                  | Firebase console > **App Check > Apps > ⋮ > Manage debug tokens**                    |
| Sign-in domains               | Firebase console > **Authentication > Settings > Authorized domains**                |

Never add `localhost` to the reCAPTCHA key, don't use the deprecated reCAPTCHA (Classic) section, and don't enforce App Check on Firestore.

## Linting and formatting

CI checks for these. Run the commands below before you push.

| Command                           | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `npm run format`                  | Formats every file with Prettier.                       |
| `npm run lint:fix`                | Lints `js/`, `tests/`, and HTML, and fixes what it can. |
| `npm run lint --prefix functions` | Lints `functions/` (also runs before every deploy).     |

Prettier follows Google style. ESLint also blocks `innerHTML`, `eval`, `==`, inline scripts and event handlers, and `javascript:` URLs. If a check fails, open its **Details** link on the pull request to see the file and line.

## Secret scanning

The **Secret scan (gitleaks)** check fails if an API key, token, password, or private key is anywhere in a branch's git history, even if a later commit deleted it. It runs on every push and pull request and hides the secret's value in the log.

- `.gitleaks.toml` allows exactly one key: the public Firebase web `apiKey`.
- `.gitleaksignore` lists findings the team has confirmed are not secrets.

**Where real keys go:** in Cloud Functions, use `defineSecret('TMDB_READ_TOKEN')` and set the value with `firebase functions:secrets:set TMDB_READ_TOKEN`. For local emulator runs, put values in `functions/.secret.local` (gitignored). Never put third-party keys in browser code.

**If the check fails:**

1. Open the check's **Details** link to see the file, line, and commit.
2. If it's a real key, **revoke it at the provider first** and create a new one. The repository is public, so deleting the commit isn't enough.
3. Remove the key from the code, and tell the team.
4. Rewrite your branch's commits to drop the key. Ask the team before rewriting a shared branch.

**False positive?** Have a teammate confirm, then add the finding's **Fingerprint** from the log to `.gitleaksignore`.

To scan locally with [gitleaks](https://github.com/gitleaks/gitleaks#installing) installed: `gitleaks git . --redact --verbose`.

## Cloud Functions

The browser can't be trusted with API keys or with creating profiles and media entries, so that work runs in `functions/`. Every callable function requires App Check and a signed-in user. Each function's request, response, and errors are described in the comment above it in [`functions/index.js`](functions/index.js).

| Function            | Called by                       | What it does                                                                                                                        |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `createUserProfile` | Sign-up, after the Auth account | Reserves the username and creates the profile documents.                                                                            |
| `searchMedia`       | Search                          | Searches one category. Each result has a title, creator, year and cover. Uses the 30-day cache, else calls the API (45 per minute). |
| `addMediaEntry`     | "Add" on a search result        | Adds a title using the cached title and cover. Rejects duplicates.                                                                  |
| `onUserDeleted`     | Firebase, automatically         | Deletes the user's data and frees their username when the account is deleted.                                                       |

**API keys** are Firebase secrets, never in the code:

| Secret               | Where to get it                                                            |
| -------------------- | -------------------------------------------------------------------------- |
| `TMDB_READ_TOKEN`    | themoviedb.org > Settings > API > **API Read Access Token** (the long one) |
| `IGDB_CLIENT_ID`     | dev.twitch.tv > Console > Applications > your app                          |
| `IGDB_CLIENT_SECRET` | The same app > **New Secret**                                              |

- For the emulator, put them in `functions/.secret.local` (gitignored), one `NAME=value` per line.
- For the live project, set each once with `firebase functions:secrets:set NAME`. Deploying fails until all three exist.

Deploy with `firebase deploy --only functions`.

## Security Rules

`firestore.rules` controls what the browser can read and write. Anything not listed is denied, and signed-out users can't do anything. Cloud Functions bypass the rules, so "Cloud Functions only" means the browser is denied and the server does it after its own checks.

| Path                                                 | Read                                                                         | Write                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `users/{uid}`                                        | Any signed-in user can get one document; no listing.                         | Owner updates. Create and delete: Cloud Functions only.                                                  |
| `users/{uid}/profile/details`                        | Owner, or anyone signed in if the profile is public.                         | Owner updates `bio` only. Create and delete: Cloud Functions only.                                       |
| `users/{uid}/mediaEntries/{entryId}`                 | Owner, or anyone signed in if public. Queries need `limit()` of 100 or less. | Owner updates `status`, `rating`, `date` and `notes` only, and can delete. Create: Cloud Functions only. |
| `users/{uid}/private/account`                        | Owner only.                                                                  | Cloud Functions only.                                                                                    |
| `usernames`, `apiCache`, `searchCache`, `rateLimits` | No browser access.                                                           | Cloud Functions only.                                                                                    |

**Valid values:**

- `users/{uid}` has exactly `displayName` (2–30 characters, no leading or trailing spaces), `avatarId` (`avatar1`–`avatar4`), and `isPublic` (`true` or `false`). An update can change any of them, but the whole document must stay valid.
- `profile/details` has only `bio`, up to 155 characters.
- `mediaEntries` updates may only change these four fields, and all four must stay valid:
  - `status`: `completed` ("Completed"), `in_progress` ("In progress") or `planned` ("Planned").
  - `rating`: a whole number 1–5, or `null` when not rated.
  - `date`: the day it was watched/read/played, as `YYYY-MM-DD`. It must be a real day and not in the future. Rules only know UTC time, so up to one day past today's UTC date is allowed, so users east of UTC can log their own "today".
  - `notes`: a string of 0–500 characters (`''` when empty).
- Everything else on a log (`category`, `source`, `externalId`, `title`, `creator`, `coverImageUrl`, `createdAt`) is set by `addMediaEntry` and can't change. Entry IDs look like `movie_603` or `show_1396`.

**Media log fields** (one document per title in `users/{uid}/mediaEntries/{category}_{externalId}`):

| Field           | Set by          | Value                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| `category`      | Server          | `movie`, `show`, `book`, `game` or `music`                                     |
| `source`        | Server          | `tmdb`, `openlibrary`, `igdb` or `musicbrainz`                                 |
| `externalId`    | Server          | The title's ID in the source API                                               |
| `title`         | Server          | Title from the API                                                             |
| `creator`       | Server          | Director (movie), show creator, author, developer or artist; `null` if unknown |
| `coverImageUrl` | Server          | Cover URL from the API, or `null`                                              |
| `status`        | User (editable) | `completed`, `in_progress` or `planned`                                        |
| `rating`        | User (editable) | Whole number 1–5, or `null` when not rated                                     |
| `date`          | User (editable) | `YYYY-MM-DD`; defaults to today; not in the future                             |
| `notes`         | User (editable) | 0–500 characters; `''` when empty                                              |
| `createdAt`     | Server          | Server time when the log was added; never changes                              |

**Always query media entries with `limit()` of 100 or less** (paginate with `startAfter()`), or the query fails with `Missing or insufficient permissions`:

```js
query(collection(db, 'users', uid, 'mediaEntries'), limit(50));
```

**Keep these values in sync.** Change every copy (and the tests) in the same pull request:

- In `js/constants.js`, `firestore.rules` and `functions/lib/validate.js`: avatar IDs, log statuses, rating range, date rule, and notes length.
- In `js/constants.js` and `firestore.rules`: display name length and bio length.
- In `js/constants.js` and `functions/lib/validate.js`: the username pattern and categories.

Deploy rule changes with `firebase deploy --only firestore:rules`.

## Testing

From the repository root, run:

```bash
npm test
```

It starts a Firestore emulator under the fake project `demo-mediashelf` (so it can never touch the real project), runs every `tests/rules/*.test.js` file, then stops. Stop any running `firebase emulators:start` first, because both use port 8080.

| File                   | Tests                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| `users.test.js`        | `users/{uid}`, `profile/details`, `private/account`              |
| `mediaEntries.test.js` | `users/{uid}/mediaEntries`                                       |
| `serverOnly.test.js`   | Server-only collections and paths with no rule                   |
| `helpers.js`           | Loads the rules, seeds test data, and connects as each test user |

The test users are Alice (public profile), Carol (private profile), Bob (no profile), and a signed-out user.

**Adding a test:** in the matching file, add a `test('bob cannot read carols private bio', …)` that makes one request as one user and checks it with `assertSucceeds` or `assertFails`. Put it under **ALLOWED** or **DENIED**. Use `{todo: true}` or `{skip: 'reason'}` only for tests waiting on a decision, and remove them when it's settled. Seeded data must pass the rules' own validation.

**Cloud Functions tests:** run `npm run test:functions` from the repository root. It runs every `functions/test/*.test.js` file against the Firestore emulator. The tests use fake API keys and fake API responses, so they need no secrets and never call the real APIs.

## Authentication

- **Sign-up:** usernames are 3–30 letters, numbers, or underscores (saved in lowercase); passwords are at least 8 characters and must match. After the Auth account is created, `signup.js` calls `createUserProfile` with the username and picked avatar. If that fails (for example, the username is taken), the new Auth account is deleted so the user can fix the form and reuse the same email.
- **Login errors don't reveal accounts.** Wrong passwords and unknown emails show the same message, and so does the reset page.
- **Redirects use `location.replace()`,** so Back doesn't return to a page you just left.

**Adding a signed-in page:**

1. Add `data-auth="pending"` to the `<html>` tag (and link `css/theme.css`, like every page). This hides the page until the user is confirmed.
2. Load the guard before `</body>`: `<script type="module" src="js/auth/signedInPage.js"></script>`. It sends signed-out visitors to log in, and users with no profile to `finish-signup.html`. Page scripts that need the user import `signedInUser` from it (see `js/frontend/shelfData.js`).
3. For a Log Out button, use `<button class="logout-button" type="button">Log Out</button>`.

**Testing auth locally:** accounts go to the Auth emulator and are deleted when it stops. The emulator doesn't send emails; the password reset link is printed in the `firebase emulators:start` terminal.

## Styles

Every page looks like My Shelf (`main-page.html`): the cream background, white rounded cards, red buttons, and uppercase Inter Tight headings.

- `css/theme.css` holds everything shared: colors, fonts, buttons (`btn`, `btn--primary`, `btn--outline`), the header (`site-header`, `logo`, `site-nav`), the footer (`site-footer`), cards (`card`), headings (`display-title`), chips, badges and form fields (`field-label`, `field-input`, `field-hint`). Link it first on every page.
- Each page then links its own stylesheet for its layout only (`main-page.css` and `modal.css`/`cust-and-settings.css` for its modals, `auth.css` for log-in, sign-up and forgot password, `landing.css`, `about.css`). Don't redefine colors or fonts there; use the variables from `theme.css`, such as `var(--primary-color)`.
- Every page loads the same fonts with this link in `<head>`:

  ```html
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@800&display=swap"
    rel="stylesheet"
  />
  ```

## Where things go

```text
.
├── *.html                    # Pages
├── css/                      # theme.css (shared look) + one stylesheet per page
├── assets/
│   ├── avatar/               # avatar1.png–avatar4.png, named after the avatar IDs
│   └── img/                  # Other images
├── js/
│   ├── firebase-config.js    # The one shared Firebase and App Check setup
│   ├── constants.js          # Shared constants (limits, categories, statuses, avatar IDs)
│   ├── functions.js          # Wrappers for the callable Cloud Functions
│   ├── auth/                 # Sign-up, finish sign-up, log-in, log-out, password reset, signed-in page guard
│   ├── database/             # Firestore reads and writes (profile, media logs)
│   ├── frontend/             # My Shelf page behavior (profile data, avatar menu, Log Media modal, Edit profile/Settings modal)
│   └── media/                # Log Media search and save, client-side validation
├── functions/
│   ├── index.js              # The four Cloud Functions
│   ├── adapters/             # One module per external API (TMDB, IGDB, Open Library, MusicBrainz)
│   ├── lib/                  # Shared helpers (validation, API requests, rate limit, cache)
│   └── test/                 # Cloud Functions tests
├── tests/rules/              # Security Rules tests
├── firestore.rules           # Security Rules
├── .github/workflows/        # CI and the secret scan
├── .gitleaks.toml            # Secret scan config
├── .gitleaksignore           # Confirmed secret-scan false positives
└── .agents/skills/           # Firebase skills for AI coding assistants
```

**Loading Firebase on a page:**

- Each page loads one entry script as a module (for example, `js/auth/login.js`). That script imports `auth`, `db`, or `functions` from `firebase-config.js`.
- Never load `firebase-config.js` with its own `<script>` tag, and never call `initializeApp` anywhere else.
- Pages without Firebase (such as `index.html`) don't load it, so they don't use up reCAPTCHA quota. This means the landing page shows Log in / Sign up even to signed-in visitors; that's on purpose, since the log-in and sign-up pages send them straight to My Shelf.
- All Firebase import URLs use the same SDK version (currently `13.0.0`). Always import `firebase-config.js` with the same path and no query string, or Firebase fails with a "duplicate app" error.

## How we work

1. Pick a sprint issue in the GitHub Project and move it to **In Progress**.
2. Create a branch from the latest `main`, named `type/description`.
3. Commit and push to your branch.
4. Before opening a pull request, rebase onto `main`. **Only rebase a branch you alone work on.**

   ```bash
   git fetch origin
   git rebase origin/main
   git push --force-with-lease
   ```

5. Open a PR into `main` with `Closes #<issue number>`. All checks must pass, and a teammate must review it.
6. If you change the data model, update `firestore.rules`, its tests, and `js/constants.js` in the same PR.
7. Delete the branch after it's merged.

## Naming conventions

| What                                         | Style              |
| -------------------------------------------- | ------------------ |
| JavaScript files                             | `camelCase.js`     |
| Functions and variables                      | `camelCase`        |
| Constants                                    | `UPPER_SNAKE_CASE` |
| CSS files, CSS classes, HTML IDs, HTML files | `kebab-case`       |

## Rules we don't break

- Never commit API keys. The Firebase web config and reCAPTCHA site key in `js/firebase-config.js` are public by design.
- Never commit, share, or screenshot an App Check debug token.
- Call external APIs only from Cloud Functions, never from browser code.
- Render text with `textContent`, never `innerHTML`.
- Read and test AI-generated code before trusting it, especially Security Rules.

## Common problems

| Problem                                                 | Fix                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firestore emulator won't start                          | Install Java 21 or newer (`java -version`).                                                                                                              |
| Port already in use (including `npm test` on port 8080) | Stop the other emulator, then try again.                                                                                                                 |
| "Cannot find module" or `Missing script: "test"`        | Pull the latest `main`, then run `npm install` and `npm install --prefix functions`.                                                                     |
| `EBADENGINE` warnings                                   | Update Node.js to 24.12 or newer.                                                                                                                        |
| Prettier or ESLint passes locally but fails in CI       | Run `npm ci`, and check `git status` for changes you haven't pushed.                                                                                     |
| Secret scan fails                                       | See [Secret scanning](#secret-scanning). Revoke a real key first.                                                                                        |
| `Missing or insufficient permissions`                   | Check **Firestore > Requests** in the Emulator UI. Common causes: a query without `limit()`, editing a field the rules don't allow, or a browser create. |
| Page can't find `firebase-config.js`                    | Check the relative path (`./` or `../`) and that the script tag has `type="module"`.                                                                     |
| No App Check debug token in the console                 | Use `localhost` or `127.0.0.1`, open a page that loads Firebase, and show all console levels.                                                            |
| App Check errors (such as 403) on localhost             | Register this browser's debug token (see [App Check](#app-check)).                                                                                       |
| reCAPTCHA or App Check errors on the live site          | The domain must be on the reCAPTCHA key and in Firebase's authorized domains.                                                                            |
| Changes not showing on GitHub Pages                     | Pages publishes from `main` after a merge. Wait a minute.                                                                                                |

## Useful links

- [GitHub repository](https://github.com/Media-Shelf-Team/MediaShelf)
- [Firebase console](https://console.firebase.google.com/u/0/project/media-shelf-d46e7/overview) (you must be a member)
- [PRD](https://docs.google.com/document/d/1s3bFq2-J2kpy2RE69nFFDAYcTe66KL1F/)
