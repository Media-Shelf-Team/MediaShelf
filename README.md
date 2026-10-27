# Media Shelf (work in progress)

Media Shelf is a web app for logging movies, TV shows, books, audiobooks, video games, and music in one place. It uses plain HTML, CSS, and JavaScript ES modules without a bundler, is published on GitHub Pages, and uses Firebase Authentication, Cloud Firestore, and Cloud Functions. This README describes the current setup and will change as the project grows.

## Current status

### Done

- [x] Firebase project connection is present in `.firebaserc` (configuration values are not listed here).
- [x] `firebase.json` configures the Auth, Functions, Firestore, and Emulator UI ports.
- [x] Shared browser Firebase setup exists in `js/firebase-config.js`; on localhost it connects Auth, Firestore, and Functions to the local emulators.
- [x] Firebase App Check is set up for the web app with the Fraud Defense (reCAPTCHA Enterprise) provider, and `js/firebase-config.js` initializes it. On localhost it uses a debug token instead (see [App Check](#app-check)).
- [x] Firebase Authentication lists the GitHub Pages domain as an authorized domain.
- [x] The current HTML pages are `index.html`, `login.html`, `signup.html`, `forgot-password.html`, `main-page.html`, `social-page.html`, `settings-and-customization.html`, and `contact.html`.
- [x] The `css/` folder contains the current page styles.
- [x] `js/frontend/` contains `nav.js` (mobile navigation and shelf tabs), `carousel.js` (temporary horizontal carousel scrolling), and `custAndSettingsTab.js` (settings and customization tabs).
- [x] The `.gitignore` excludes local secrets, service-account files, and generated dependencies/logs.
- [x] Firebase Functions package configuration exists in `functions/package.json`.
- [x] CI runs Prettier, ESLint, and the Firestore rules tests on every push and on every pull request into `main` (`.github/workflows/ci.yml`).
- [x] MS-03: Security Rules test harness. `npm test` runs the tests in `tests/rules/` against the Firestore emulator (see [Testing](#testing)).
- [x] Email and password authentication: sign up, log in, log out, and password reset by email are built in `js/auth/`. Signed-in pages redirect signed-out users to the login page (see [Authentication](#authentication)).
- [x] MS-10: Security Rules. `firestore.rules` allows owner and public-profile access to `users/{uid}` and its subcollections, validates every browser write, and leaves profile creation and deletion, media entry creation, and the server-only collections to Cloud Functions (see [Security Rules](#security-rules)).
- [x] Security Rules tests rewritten for the current `firestore.rules`. `users.test.js` and `serverOnly.test.js` cover `users/{uid}`, `profile/details`, `private/account`, the server-only collections, and the default-deny catch-all, using the test users Alice, Bob, Carol, and a signed-out user (see [Testing](#testing)).

### In progress / placeholder

- [ ] Three tests in `users.test.js` expect listing to succeed (`bob can list the users collection`, `bob can list alices profile`, `alice can list her own private collection`), but `firestore.rules` denies `list` on all three paths. They are marked `{todo: true}`, so they don't fail CI. We need to decide for each one whether to flip it to `assertFails` or change the rules.
- [ ] The two avatar tests in `users.test.js` are still skipped (waiting on #97). The rules and the seed data already use `avatar1`-`avatar3`. When the list is final, remove the `skip` and change their `avatarId: '2'` to a valid ID such as `'avatar2'`.
- [ ] `mediaEntries.test.js` has only one test (Alice reading her own entry). The media entry rules (gated reads, the `limit()` cap on queries, `status` updates, and deletes) still need tests.
- [ ] `AVATAR_IDS` in `js/constants.js` is still empty, while `firestore.rules` accepts `avatar1`, `avatar2`, and `avatar3`. We need to finalize an avatar list and naming convention.
- [ ] `functions/index.js` is the Firebase starter scaffold; Media Shelf functions have not been added there yet. When the callable functions (`createUserProfile`, `searchMedia`, `addMediaEntry`) are added, each one must enforce App Check.
- [ ] Sign-up creates the Firebase Auth account only. The username is validated in the browser but not saved yet; saving it, and creating the profile, waits for `createUserProfile` in Cloud Functions.
- [ ] The Social link in the `main-page.html` nav is commented out for now, and the Log Out button sits in its place.
- [ ] Cloud Functions have no automated tests yet.
- [ ] `js/database/` contains only a `.gitkeep` file: placeholder — not built yet.
- [ ] `assets/avatars/` and `assets/credits/` do not exist in the repository yet. Create them when the first files are added.
- [ ] `firestore.indexes.json` exists, but currently defines no indexes.

### Next up

- [ ] MS-02: conventions and branch protection.
- [ ] MS-06: app shell.
- [ ] Write the media entry tests in `mediaEntries.test.js`.
- [ ] MS-11: `createUserProfile`.

## First-time setup

Every teammate does this once on each computer they work on.

1. Install **Node.js 24.12 or newer (24.x)**, and check your version with `node -v`. The root `package.json` requires at least 24.12.0, because the rules-testing library needs it. `functions/package.json` declares `24`, which picks the Cloud Functions runtime.

2. Install **Java 21 or newer**. The Firestore emulator needs Java, and Firebase CLI 15 and later will not run the emulators on older Java versions. Check your version:

   ```bash
   java -version
   ```

3. Install the Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

   If this is failing, use the following command instead:

   ```bash
   curl -sL https://firebase.tools | bash
   ```

4. Ask the project owner to add you as a member of the Firebase project, then sign in:

   ```bash
   firebase login
   ```

5. Clone the repository from its GitHub page. From the repository root, install both sets of dependencies:

   ```bash
   npm install
   npm install --prefix functions
   ```

   The root install provides ESLint, Prettier, and the testing tools (the project's own Firebase CLI, `@firebase/rules-unit-testing`, and the `firebase` SDK). The `functions/` install provides the Cloud Functions dependencies and their own ESLint.

6. Open the repository folder in VS Code and accept the prompt to install the recommended extensions (Prettier and ESLint, listed in `.vscode/extensions.json`). With them installed, files are formatted with Prettier every time you save.

> Do NOT run `firebase init`. The repository is already connected to the Firebase project through `.firebaserc`.

> The first time you run the app locally in a browser, register your App Check debug token (see [App Check](#app-check)). Do this again for each new browser or computer.

## Running the app locally

1. In a terminal at the repository root, start the emulators:

   ```bash
   firebase emulators:start
   ```

   Open the Emulator UI at [http://localhost:4000](http://localhost:4000).

2. In a second terminal at the repository root, serve the pages:

   ```bash
   npx serve .
   ```

   Open the URL printed by `serve`.

When you open the app on `localhost` or `127.0.0.1`, `js/firebase-config.js` connects the browser SDK to the local Auth, Firestore, and Functions emulators. Sign-ups and database requests stay local and do not reach the live Firebase services. The Firestore emulator loads `firestore.rules`, so local requests follow the same [Security Rules](#security-rules) as the live database. Profiles and media entries are created only by Cloud Functions, which are not built yet, so to try reads and updates locally, add the documents by hand in the Emulator UI first.

| Emulator       | Port |
| -------------- | ---: |
| Authentication | 9099 |
| Functions      | 5001 |
| Firestore      | 8080 |
| Emulator UI    | 4000 |

In the Emulator UI:

- Use **Authentication** to view and manage test users.
- Use **Firestore** to view local data.
- Open **Firestore > Requests** to see which Security Rule allowed or denied a request.
- Use **Logs** to view function output.

## App Check

App Check lets Firebase confirm that requests come from the real Media Shelf site, not from a script that copied our public Firebase config. It is set up in `js/firebase-config.js` with the Fraud Defense (reCAPTCHA Enterprise) provider, which runs invisibly in the background.

- **Where it is enforced:** only on the callable Cloud Functions (`createUserProfile`, `searchMedia`, `addMediaEntry`), with `onCall({enforceAppCheck: true}, ...)`. It is **not** enforced on Firestore, which is protected by Security Rules. `onUserDeleted`, the `functions/adapters/` modules, and the `functions/lib/` helpers don't need it.
- **Browser code needs nothing extra.** Any script that imports from `js/firebase-config.js` gets App Check automatically, and the Firebase SDK attaches the token to every function call.
- **The reCAPTCHA site key is public by design,** like the Firebase web config. It only works on the domains registered for it. Keep it written directly inside `new ReCaptchaEnterpriseProvider('…')`.

### Register your debug token (each teammate, each browser)

reCAPTCHA does not run on localhost, so local development uses a debug token instead:

1. Run the app locally (see [Running the app locally](#running-the-app-locally)) and open a page that loads Firebase.
   (If the debug-token is not showing in the console, see [Common Problems](#common-problems)).
2. Open the browser's developer console and find the line `AppCheck debug token: "…"`.
3. In the Firebase console, go to **App Check > Apps**, click **⋮** next to the web app, and choose **Manage debug tokens**.
4. Click **Add debug token**, name it after yourself and the browser (for example, "Andreas – laptop Chrome"), paste the token, and save.
5. Reload the page. The App Check errors in the console should stop.

The token is saved in that browser, so it stays the same until you clear the browser's site data. A different browser, computer, or private window gets a new token that must be registered too. **A debug token works like a password:** never commit it, paste it into chat, or include it in a screenshot. If one leaks, delete it in **Manage debug tokens** and register a new one.

### Where the settings live (admins)

| Setting                       | Where                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| reCAPTCHA key and its domains | Google Cloud console > **Fraud Defense > reCAPTCHA** (Web, score-based, no checkbox) |
| App Check registration        | Firebase console > **App Check > Apps** (Fraud Defense section)                      |
| Debug tokens                  | Firebase console > **App Check > Apps > ⋮ > Manage debug tokens**                    |
| Sign-in domains               | Firebase console > **Authentication > Settings > Authorized domains**                |

Never add `localhost` to the reCAPTCHA key's domains; use debug tokens instead. Do not fill in the deprecated **reCAPTCHA** (Classic) section in the App Check console, and do not turn on App Check enforcement for Firestore there.

## Linting and formatting

CI runs the same commands listed below. Run them before you push so the checks pass on your pull request.

| Command                                    | What it does                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `npm run format`                           | Formats every file with Prettier.                                              |
| `npm run format:check`                     | Checks formatting without changing files (what CI runs).                       |
| `npm run lint`                             | Lints `js/`, `tests/`, and the HTML pages with ESLint.                         |
| `npm run lint:fix`                         | Same as `lint`, and fixes what ESLint can fix automatically.                   |
| `npm run lint --prefix functions`          | Lints `functions/` with its own ESLint config (also runs before every deploy). |
| `npm run lint --prefix functions -- --fix` | Same as above, and fixes what ESLint can fix automatically.                    |

Configuration lives in `.prettierrc.json`, `.prettierignore`, `.eslintrc.js`, `.eslintignore`, and `functions/.eslintrc.js`. Prettier is set to match Google style (single quotes, no spaces inside `{}`, 80-character lines). The ESLint configs also block `innerHTML` and other HTML-injection APIs, `eval`, `==`, inline `<script>` blocks, inline `on*=` event handlers, and `javascript:` URLs.

If a check fails on a pull request, open the failed check's **Details** link, expand the step with the red ❌, and read its output. Prettier lists the unformatted files (fix with `npm run format`). ESLint lists the file, `line:column`, message, and rule name for each error.

## Security Rules

`firestore.rules` decides what the browser may read and write in Firestore. It is deny-by-default: anything not matched below, including any new collection, is denied by the catch-all rule at the bottom of the file.

Cloud Functions use the Admin SDK, which skips Security Rules entirely. That is why some writes are marked "Cloud Functions only": the rules deny them from the browser, and the matching function does them on the server after its own checks.

### Who can do what

"Signed in" means any user with a Firebase Auth account. "Owner" means the signed-in user whose UID matches `{uid}` in the path. "Public" means `users/{uid}` has `isPublic: true`.

| Path                                                 | Read                                                                                            | Write                                                                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `users/{uid}`                                        | Any signed-in user can get one document. Listing the collection: no.                            | **Update:** owner only, with valid fields (below). **Create / delete:** Cloud Functions only (`createUserProfile`, `onUserDeleted`). |
| `users/{uid}/profile/details`                        | Owner, or any signed-in user if the profile is public.                                          | **Update:** owner only, and only the `bio` field. **Create / delete:** Cloud Functions only.                                         |
| `users/{uid}/mediaEntries/{entryId}`                 | Owner, or any signed-in user if the profile is public. Queries need a `limit()` of 100 or less. | **Update:** owner only, and only the `status` field. **Delete:** owner. **Create:** Cloud Functions only (`addMediaEntry`).          |
| `users/{uid}/private/account`                        | Owner only.                                                                                     | Cloud Functions only.                                                                                                                |
| `usernames`, `apiCache`, `searchCache`, `rateLimits` | No browser access.                                                                              | Cloud Functions only.                                                                                                                |
| Anything else                                        | Denied.                                                                                         | Denied.                                                                                                                              |

Signed-out users can't read or write anything.

### What a valid write looks like

- **`users/{uid}`** must contain exactly `displayName`, `avatarId`, and `isPublic`, no more and no fewer. An update must send all three (`setDoc` with all fields, or `updateDoc` on a document that already has them).
  - `displayName`: a string of 2–30 characters with no leading or trailing spaces.
  - `avatarId`: one of `avatar1`, `avatar2`, `avatar3` (Currently).
  - `isPublic`: `true` or `false`.
- **`profile/details`** may contain only `bio` (Currently), a string of at most 155 characters.
- **`mediaEntries/{entryId}`**: an update may change only `status` (Currently, TR will include notes and other fields), and the new value must be `planned`, `in_progress`, or `completed`. Every other field is set by `addMediaEntry` and can't be edited from the browser. Entry IDs follow the pattern `{category}_{externalId}` (for example, `movie_603`).

### Querying media entries

The Log Page and category views read entries with a query, and the rules currently only allow a query that asks for **100 documents or fewer**. Always add `limit()` and paginate with `startAfter()`:

```js
import {
  collection,
  query,
  where,
  limit,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const q = query(
  collection(db, 'users', uid, 'mediaEntries'),
  where('status', '==', 'completed'),
  limit(50),
);
```

A query without `limit()`, or with a limit above 100, fails with `Missing or insufficient permissions`.

Reading another user's profile details or media entries makes the rules look up their `users/{uid}` document to check `isPublic`. Firestore bills that lookup as one extra document read per request.

### Keep the rules and `js/constants.js` in sync

Some limits are written in both places, because the rules can't import JavaScript. When you change one, change the other in the same pull request, together with the tests:

| Value               | `js/constants.js`                                             | `firestore.rules`             |
| ------------------- | ------------------------------------------------------------- | ----------------------------- |
| Display name length | `MIN_DISPLAY_NAME_LENGTH` (2), `MAX_DISPLAY_NAME_LENGTH` (30) | `isValidDisplayName()`        |
| Bio length          | `MAX_BIO_LENGTH` (155)                                        | `profile/details` update rule |
| Avatar IDs          | `AVATAR_IDS`                                                  | `isValidAvatarId()`           |
| Log statuses        | `LOG_STATUS`                                                  | `mediaEntries` update rule    |

### Updating firestore.rules

Deploy the updated `firestore.rules` to the Firebase project using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Testing

The Firestore Security Rules are tested automatically. From the repository **root**, run:

```bash
npm test
```

This one command:

1. Starts the Firestore emulator only (no Auth or Functions emulators), under the fake project ID `demo-mediashelf`. The `demo-` prefix means the tests can never reach our real Firebase project, and no login is needed.
2. Runs every `tests/rules/*.test.js` file with Node's built-in test runner (`node:test`).
3. Stops the emulator and throws away its data. If any test fails, the command fails, and so does the **Firestore rules tests** check in CI.

The first run downloads the Firestore emulator, so it takes longer.

### How the tests are organized

| File                               | What it tests                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tests/rules/helpers.js`           | Shared setup: loads `firestore.rules` into the emulator, seeds test data, and gives one connection per test user |
| `tests/rules/users.test.js`        | `users/{uid}`, `users/{uid}/profile/details`, and `users/{uid}/private/account`                                  |
| `tests/rules/mediaEntries.test.js` | `users/{uid}/mediaEntries` (one test so far)                                                                     |
| `tests/rules/serverOnly.test.js`   | Server-only collections (`usernames`, `apiCache`, `searchCache`, `rateLimits`) and paths with no rule            |
| `tests/package.json`               | `{"type": "module"}`, so Node runs the test files as ES modules                                                  |

Test users, created by `seedData()` in `helpers.js`:

| Helper                 | Who                                          | Seeded data                                                                                                      |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `aliceDb(testEnv)`     | Alice, signed in, with a **public** profile  | `users/alice` (`isPublic: true`, `avatarId: 'avatar1'`), `profile/details`, `private/account`, `usernames/alice` |
| `bobDb(testEnv)`       | Bob, signed in, another user                 | none (no profile)                                                                                                |
| `carolDb(testEnv)`     | Carol, signed in, with a **private** profile | `users/carol` (`isPublic: false`, `avatarId: 'avatar2'`), `profile/details`, `private/account`                   |
| `signedOutDb(testEnv)` | Not signed in                                | none                                                                                                             |

`seedData()` also writes one document to each server-only collection: `apiCache/movie_550`, `searchCache/q1`, and `rateLimits/tmdb`.

Each test reads or writes a document as one of these users and checks the result with `assertSucceeds` (the rules must allow it) or `assertFails` (the rules must deny it).

`users.test.js` clears the emulator and seeds the data again before every test, because its allowed writes change the documents. The other files seed once and only make requests that are denied, so nothing changes between tests.

The seed data must pass the rules' own validation. A `users/{uid}` update is checked against the whole document after the change, not just the fields sent, so one invalid seeded field (such as an avatar ID the rules don't accept) makes every update by that user fail.

### Adding a test

1. Open the test file for the area you are testing, and import any helpers you need from `./helpers.js`.
2. Add a `test('plain-English description', async () => { ... })` that makes one request as one user and checks the result. Name the test after the user and the outcome, for example `bob cannot read carols private bio`.
3. Put it in the file's matching section: requests the rules should deny go under **DENIED**, requests they should allow under **ALLOWED**.
4. When the rules change, update the tests in the same pull request (see [How we work](#how-we-work)).

Two options mark tests that aren't ready:

| Option             | What happens                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `{todo: true}`     | The test still runs, but a failure doesn't fail `npm test`. The output shows `ok … # TODO` if it passes and `not ok … # TODO` if it fails. |
| `{skip: 'reason'}` | The test doesn't run at all. The reason appears in the output.                                                                             |

Use them only for behavior that is waiting on a decision or another issue, and remove them as soon as that is settled. A todo test hides a real failure, so check the `# TODO` lines in the output.

If a test needs a setup step that must work first (for example, Alice making her profile private before Bob tries to read her bio), wrap that step in `assertSucceeds`. Then a broken setup step is reported as such, instead of looking like the rule under test failed.

Notes:

- Run `npm test` from the repository root: `helpers.js` reads `firestore.rules` from the folder the command runs in.
- `npm test` starts its own emulator, so stop any `firebase emulators:start` you have running first. Otherwise port 8080 is already in use.
- The project ID `demo-mediashelf` appears in two places, the `test` script in `package.json` and `createTestEnv()` in `helpers.js`. Keep them the same.
- `npm test` uses the project's own Firebase CLI (15.34.0), the same version as CI, not a globally installed one. To run that CLI directly, use `npx firebase …`.

## Authentication

### Rules the auth code follows

- **Sign-up checks:** usernames are 3–30 characters of lowercase letters, numbers, and underscores; the sign-up script lowercases what the user types before checking it (and using it - WIP). Passwords are at least 8 characters, and both password fields must match. Firebase Authentication checks the email.
- **Login errors don't reveal accounts:** a wrong password and an email with no account both show "Incorrect email or password." The reset page shows the same message whether or not the email has an account.
- **Redirects use `location.replace()`, not `location.href`,** so Back doesn't return to the login form after logging in, or to a signed-in page after logging out.
- **Login never checks password length.** Only sign-up does, so raising the minimum later can't lock out existing users.

### Adding a signed-in page

1. Add `data-auth="pending"` to the page's `<html>` tag. The rule in `css/auth.css` hides the page until the user is confirmed, so signed-out users never see it before the redirect.
2. Link `css/auth.css` in the `<head>`.
3. Load the guard before `</body>`:

   ```html
   <script type="module" src="js/auth/signedInPage.js"></script>
   ```

4. For a Log Out button, use `<button class="logout-button" type="button">Log Out</button>`. The script finds buttons by that class, so desktop and mobile navs can each have one.

`signedInPage.js` also reloads the page when the browser restores it from its back/forward cache. Otherwise Back after logging out could show a frozen copy of a signed-in page without checking again.

### Testing auth in the emulators

With the emulators running and the site open on `localhost` or `127.0.0.1`, every sign-up and login goes to the local Auth emulator. Accounts you create there don't need real email addresses, and they appear in the Emulator UI under **Authentication**.

- **Password reset:** the emulator doesn't send emails. Submit the forgot-password form, then find the line `To reset the password for …, follow this link:` in the terminal running `firebase emulators:start`. Open that link and set a new password. The old password should then fail and the new one should work.
- **Stopping the emulators deletes their accounts.** Sign up again after a restart.

## Where things go

The tree below reflects the current repository. A folder listed as a placeholder contains only a `.gitkeep` unless stated otherwise.

```text
.
├── *.html                    # Pages: index, login, signup, forgot-password, main-page, social-page, settings-and-customization, contact
├── css/                      # Page styles
├── assets/
│   └── img/                  # Images (mediashelfbgidea1.png, dustyicon1–4.png, starwars.jpg)
├── js/
│   ├── firebase-config.js    # One shared Firebase and App Check setup; import auth, db, and functions from here
│   ├── constants.js          # Shared constants: page paths, auth and profile limits, categories, statuses, avatar IDs
│   ├── auth/                 # Sign-up, log-in, log-out, password reset, and the signed-in page guard
│   ├── database/             # Firestore reads and writes; placeholder — not built yet
│   ├── frontend/             # Browser-side behavior: nav.js, carousel.js, custAndSettingsTab.js
│   └── media/                # Media-related JavaScript files
├── firestore.rules           # Firestore Security Rules (see Security Rules)
├── firestore.indexes.json    # Firestore index configuration (currently empty)
├── tests/
│   ├── package.json          # Makes the test files ES modules ("type": "module")
│   └── rules/                # Security Rules tests: helpers.js plus one test file per area (see Testing)
├── functions/
│   ├── index.js              # Firebase starter scaffold; project functions are not implemented yet
│   ├── adapters/             # API adapter modules
│   ├── lib/                  # Shared helper modules
│   └── .eslintrc.js          # ESLint config for Cloud Functions
├── .github/
│   ├── workflows/ci.yml      # CI: Prettier and ESLint checks, and the Firestore rules tests
│   └── pull_request_template.md
├── .vscode/                  # Shared editor settings and recommended extensions
├── package.json              # Root tooling: ESLint, Prettier, the rules tests, and their scripts
├── .eslintrc.js              # ESLint config for js/, tests/, and HTML pages
├── .prettierrc.json          # Prettier config
├── .agents/skills/           # Firebase skills for AI coding assistants
└── skills-lock.json          # Skill lock file
```

`js/firebase-config.js` is the one shared browser Firebase setup, including App Check. Every browser script should import `auth`, `db`, and `functions` from it; never call `initializeApp` anywhere else.

### How pages load Firebase

Each page that uses Firebase loads **one** entry script for that page, as a module, just before `</body>`. That script imports what it needs, and the imports load the shared setup (Firebase, App Check, and the emulator connections) first. For example, `login.html` loads:

```html
<script type="module" src="js/auth/login.js"></script>
```

and `js/auth/login.js` imports the shared auth helpers, which in turn import `auth` from `firebase-config.js`:

```js
import {
  getAuthErrorMessage,
  redirectIfSignedIn,
  login,
  showError,
} from './auth.js';
import {HOME_PAGE} from '../constants.js';
```

- Don't load `js/firebase-config.js` directly with its own `<script>` tag; let the page's script import it.
- Pages that don't use Firebase (such as `index.html` and `contact.html`) load neither. Loading Firebase there would start App Check and run reCAPTCHA checks for nothing. Each check counts toward our free monthly reCAPTCHA quota, and checks past that quota are billed.
- Every Firebase import URL must use the same SDK version (currently `13.0.0`). When upgrading, change all of them together.
- Always import `firebase-config.js` with the same path and no query string (such as `?v=2`). A different URL makes the browser load it twice, and Firebase fails with a "duplicate app" error.

The existing `js/media/` files are `entries.js`, `search.js`, and `validate.js`. Use this area for media search, adding items, status changes, and deletion as those features are built. `js/frontend/` is for browser-side behavior such as animations and actions, separate from Firebase data access. `js/database/` is for Firestore reads and writes and currently contains only a `.gitkeep` file. Images belong in `assets/img/`. `js/auth/` holds the authentication code (see [Authentication](#authentication)).

The `functions/adapters/` folder has one module per external API (`tmdb.js`, `igdb.js`, `openlibrary.js`, and `musicbrainz.js`). `functions/lib/` holds shared helpers (`cache.js`, `rateLimit.js`, and `validate.js`). As Cloud Functions are implemented, keep `index.js` focused on importing and exporting functions, with each function's logic in its own file.

## How we work

1. Pick an issue for the current sprint from the GitHub Project and move it to **In Progress**.
2. Pull the latest `main`, then create a branch from it named `type/description`.
3. Commit to your branch and push it.
4. Before opening a pull request, rebase onto the latest `main` and push with `--force-with-lease`. **ONLY REBASE A BRANCH THAT YOU ALONE WORK ON.**

   ```bash
   git fetch origin
   git rebase origin/main
   git push --force-with-lease
   ```

5. Open a PR into `main` with `Closes #<issue number>` in its description. All CI checks must pass, and at least one other teammate reviews it before merging.
6. If you change the data model, update `firestore.rules`, its tests, and any matching values in `js/constants.js` in the same PR.
7. After the PR is merged, delete the branch.

## Naming Conventions

- JavaScript files: `camelCase.js` for general scripts.
- Functions: `camelCase` for function names.
- Variables and constants: `camelCase` for variables, `UPPER_SNAKE_CASE` for constants.
- CSS classes: `kebab-case`.
- CSS Files: `kebab-case.css`
- HTML IDs: `kebab-case`.
- HTML Files: `kebab-case.html`

## Rules we don't break

- Never commit API keys, `.secret.local`, or `*-firebase-adminsdk-*.json` files. The Firebase web config and the reCAPTCHA site key in `js/firebase-config.js` are public by design; those are fine.
- Never commit, share, or screenshot an App Check debug token.
- Call external APIs (TMDB, IGDB, Open Library, MusicBrainz) only from Cloud Functions, never from browser code.
- Render user and API text with `textContent`, never `innerHTML`. ESLint enforces this.
- Read and test AI-generated code (including Copilot and Gemini output) before trusting it, especially Security Rules.

## Common problems

**Firestore emulator won't start**

Check that Java 21 or newer is installed:

```bash
java -version
```

**Port already in use**

Stop the other emulator process or close its old terminal, then start the emulators again.

**"Cannot find module" errors after pulling**

Someone added or updated a package. Install again from the repository root:

```bash
npm install
npm install --prefix functions
```

**`npm error Missing script: "test"`**

Your copy of the repository is older than the test harness. Pull the latest `main`, then run `npm install`.

**`npm test` says port 8080 is already in use**

A Firestore emulator is already running, usually from `firebase emulators:start` in another terminal. Stop it, then run `npm test` again.

**`EBADENGINE` warnings during `npm install`**

Your Node.js version is older than 24.12. Update Node.js (see [First-time setup](#first-time-setup)), then run `npm install` again.

**Prettier or ESLint passes locally but fails in CI**

Run `npm ci` instead of `npm install` to get exactly the package versions CI uses, and check `git status` for changes you have not committed or pushed.

**`Missing or insufficient permissions` from Firestore**

The Security Rules denied the request. Open **Firestore > Requests** in the Emulator UI to see which rule denied it. Common causes: a media entries query without `limit()` (or with a limit above 100), an update that changes a field the rules don't allow, a value outside the allowed list, or a browser create of a document that only Cloud Functions may create (see [Security Rules](#security-rules)).

**My page can't find `firebase-config.js`**

Check the relative import path (`./` versus `../`) and make sure the script tag has `type="module"`.

**I don't see an App Check debug token in the console**

- Make sure the page actually loads Firebase: it needs a script that imports `firebase-config.js`. Pages that don't use Firebase never start App Check.
- Set the console's filter to show all levels (including Info/Verbose), then search for `debug token`.
- Open the site on `localhost` or `127.0.0.1`, not your computer's network address. The debug token only turns on for those two addresses.

**App Check errors (such as 403) in the console on localhost**

Your debug token isn't registered yet, or you're in a different browser. Register the token shown in the console (see [App Check](#app-check)), then reload.

**reCAPTCHA or App Check errors on the live site**

The site's domain must match the domains on the reCAPTCHA key (Google Cloud console) and the authorized domains in Firebase Authentication. Check both.

**Changes aren't showing on GitHub Pages**

GitHub Pages publishes from `main` after the PR is merged. Give it a minute to update.

## Useful links

- [GitHub Repository](https://github.com/Media-Shelf-Team/MediaShelf)
- [Firebase console](https://console.firebase.google.com/u/0/project/media-shelf-d46e7/overview) (you must be added as a member)
- [PRD](https://docs.google.com/document/d/1s3bFq2-J2kpy2RE69nFFDAYcTe66KL1F/)
