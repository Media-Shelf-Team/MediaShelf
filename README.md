# Media Shelf (work in progress)

Media Shelf is a web app for logging movies, TV shows, books, audiobooks, video games, and music in one place. It uses plain HTML, CSS, and JavaScript ES modules without a bundler, is published on GitHub Pages, and uses Firebase Authentication, Cloud Firestore, and Cloud Functions. This README describes the current setup and will change as the project grows.

## Current status

### Done

- [x] Firebase project connection is present in `.firebaserc` (configuration values are not listed here).
- [x] `firebase.json` configures the Auth, Functions, Firestore, and Emulator UI ports.
- [x] Shared browser Firebase setup exists in `js/firebase-config.js`; on localhost it connects Auth, Firestore, and Functions to the local emulators.
- [x] The current HTML pages are `index.html`, `login.html`, `signup.html`, `forgot-password.html`, `mainPage.html`, `socialPage.html`, and `contact.html`.
- [x] The `css/` folder contains the current page styles.
- [x] `js/frontend/` contains `nav.js` (mobile navigation and shelf tabs) and `carousel.js` (temporary horizontal carousel scrolling).
- [x] The `.gitignore` excludes local secrets, service-account files, and generated dependencies/logs.
- [x] Firebase Functions package configuration exists in `functions/package.json`.
- [x] CI runs Prettier and ESLint on every push and on every pull request into `main` (`.github/workflows/ci.yml`).

### In progress / placeholder

- [ ] `firestore.rules` currently denies every read and write. Firestore access will not work until the rules are implemented.
- [ ] `functions/index.js` is the Firebase starter scaffold; Media Shelf functions have not been added there yet.
- [ ] `tests/rules/` contains comment-only test files and a `.gitkeep`; the test harness and assertions are placeholder — not built yet. CI does not run tests yet.
- [ ] `js/auth/` and `js/database/` contain only `.gitkeep` files: placeholder — not built yet.
- [ ] `assets/avatars/` and `assets/credits/` do not exist in the repository yet. Create them when the first files are added.
- [ ] `firestore.indexes.json` exists, but currently defines no indexes.

### Next up

- [ ] MS-02: conventions and branch protection.
- [ ] MS-03: Security Rules test harness.
- [ ] MS-06: app shell.
- [ ] MS-10: Security Rules.
- [ ] MS-11: `createUserProfile`.

## First-time setup

Every teammate does this once on each computer they work on.

1. Install **Node.js 24**. Both `package.json` files declare Node.js 24, and CI uses it.

2. Install **Java 21 or newer**. The Firestore emulator needs Java, and Firebase CLI 15 and later will not run the emulators on older Java versions. Check your version:

   ```bash
   java -version
   ```

3. Install the Firebase CLI:

   ```bash
   npm install -g firebase-tools
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

   The root install provides ESLint and Prettier. The `functions/` install provides the Cloud Functions dependencies and their own ESLint.

6. Open the repository folder in VS Code and accept the prompt to install the recommended extensions (Prettier and ESLint, listed in `.vscode/extensions.json`). With them installed, files are formatted with Prettier every time you save.

7. Do NOT run `firebase init`. The repository is already connected to the Firebase project through `.firebaserc`.

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

When you open the app on `localhost` or `127.0.0.1`, `js/firebase-config.js` connects the browser SDK to the local Auth, Firestore, and Functions emulators. Sign-ups and database requests stay local and do not reach the live Firebase services. Note that Firestore requests are currently denied by the placeholder rules.

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

## Where things go

The tree below reflects the current repository. A folder listed as a placeholder contains only a `.gitkeep` unless stated otherwise.

```text
.
├── *.html                    # Pages: index, login, signup, forgot-password, mainPage, socialPage, contact
├── css/                      # Page styles
├── assets/
│   └── img/                  # Images (mediashelfbgidea1.png, dustyicon1.png, starwars.jpg)
├── js/
│   ├── firebase-config.js    # One shared Firebase setup; import auth, db, and functions from here
│   ├── constants.js          # Shared constants
│   ├── auth/                 # placeholder — not built yet
│   ├── database/             # Firestore reads and writes; placeholder — not built yet
│   ├── frontend/             # Browser-side behavior: nav.js, carousel.js
│   └── media/                # Media-related JavaScript files
├── firestore.rules           # Firestore Security Rules
├── firestore.indexes.json    # Firestore index configuration (currently empty)
├── tests/rules/              # Rules test files; assertions and harness are placeholder — not built yet
├── functions/
│   ├── index.js              # Firebase starter scaffold; project functions are not implemented yet
│   ├── adapters/             # API adapter modules
│   ├── lib/                  # Shared helper modules
│   └── .eslintrc.js          # ESLint config for Cloud Functions
├── .github/
│   ├── workflows/ci.yml      # CI: Prettier and ESLint checks
│   └── pull_request_template.md
├── .vscode/                  # Shared editor settings and recommended extensions
├── package.json              # Root tooling: ESLint, Prettier, and their scripts
├── .eslintrc.js              # ESLint config for js/, tests/, and HTML pages
├── .prettierrc.json          # Prettier config
├── .agents/skills/           # Firebase skills for AI coding assistants
└── skills-lock.json          # Skill lock file
```

`js/firebase-config.js` is the one shared browser Firebase setup. Every browser script should import `auth`, `db`, and `functions` from it; never call `initializeApp` anywhere else.

The existing `js/media/` files are `entries.js`, `search.js`, and `validate.js`. Use this area for media search, adding items, status changes, and deletion as those features are built. `js/frontend/` is for browser-side behavior such as animations and actions, separate from Firebase data access. `js/database/` is for Firestore reads and writes and currently contains only a `.gitkeep` file. Images belong in `assets/img/`. The `js/auth/` folder is also placeholder — not built yet; it is intended for sign-up, sign-in, sign-out, and password reset code.

The `functions/adapters/` folder has one module per external API (`tmdb.js`, `igdb.js`, `openlibrary.js`, and `musicbrainz.js`). `functions/lib/` holds shared helpers (`cache.js`, `rateLimit.js`, and `validate.js`). As Cloud Functions are implemented, keep `index.js` focused on importing and exporting functions, with each function's logic in its own file.

## How we work

1. Pick an issue for the current sprint from the GitHub Project and move it to **In Progress**.
2. Pull the latest `main`, then create a branch from it named `type/MS-xx-short-name`. Replace `xx` with the backlog issue number and `short-name` with a brief description. Use `feature/` for app features and `infra/` for tooling and CI.
3. Commit to your branch and push it.
4. Before opening a pull request, rebase onto the latest `main` and push with `--force-with-lease`. **ONLY REBASE A BRANCH THAT YOU ALONE WORK ON.**

   ```bash
   git fetch origin
   git rebase origin/main
   git push --force-with-lease
   ```

5. Open a PR into `main` with `Closes #<issue number>` in its description. All CI checks must pass, and at least one other teammate reviews it before merging.
6. If you change the data model, update `firestore.rules` and its tests in the same PR.
7. After the PR is merged, delete the branch.

## Rules we don't break

- Never commit API keys, `.secret.local`, or `*-firebase-adminsdk-*.json` files. The Firebase web config in `js/firebase-config.js` is public by design; that one is fine.
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

**Prettier or ESLint passes locally but fails in CI**

Run `npm ci` instead of `npm install` to get exactly the package versions CI uses, and check `git status` for changes you have not committed or pushed.

**My page can't find `firebase-config.js`**

Check the relative import path (`./` versus `../`) and make sure the script tag has `type="module"`.

**Changes aren't showing on GitHub Pages**

GitHub Pages publishes from `main` after the PR is merged. Give it a minute to update.

## Useful links

- [GitHub Repository](https://github.com/jt4ylor10/MediaShelf)
- [Firebase console](https://console.firebase.google.com/u/0/project/media-shelf-d46e7/overview) (you must be added as a member)
- [PRD](https://docs.google.com/document/d/1s3bFq2-J2kpy2RE69nFFDAYcTe66KL1F/) 