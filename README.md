# Media Shelf (work in progress)

Media Shelf is a web app for logging movies, TV shows, books, audiobooks, video games, and music in one place. It uses plain HTML, CSS, and JavaScript ES modules without a bundler, is published on GitHub Pages, and uses Firebase Authentication, Cloud Firestore, and Cloud Functions. This README describes the current setup and will change as the project grows.

## Current status

### Done

- [x] Firebase project connection is present in `.firebaserc` (configuration values are not listed here).
- [x] `firebase.json` configures the Auth, Functions, Firestore, and Emulator UI ports.
- [x] Shared browser Firebase setup exists in `js/firebase-config.js`; on localhost it connects Auth, Firestore, and Functions to the local emulators.
- [x] The current HTML pages are `index.html`, `login.html`, `signup.html`, `forgot-password.html`, and `mainPage.html`.
- [x] The `css/` folder contains the current page styles.
- [x] The `.gitignore` excludes local secrets, service-account files, and generated dependencies/logs.
- [x] Firebase Functions package configuration exists in `functions/package.json`.

### In progress / placeholder

- [ ] `firestore.rules` currently denies every read and write. Firestore access will not work until the rules are implemented.
- [ ] `functions/index.js` is the Firebase starter scaffold; Media Shelf functions have not been added there yet.
- [ ] `tests/rules/` contains comment-only test files and a `.gitkeep`; the test harness and assertions are placeholder — not built yet.
- [ ] `js/auth/`, `js/database/`, and `js/frontend/` contain only `.gitkeep` files: placeholder — not built yet.
- [ ] `assets/avatars/` and `assets/credits/` are empty: placeholder — not built yet.
- [ ] `assets/img/` contains `mediashelfbgidea1.png`; there is no root `img/` directory.
- [ ] `firestore.indexes.json` exists, but currently defines no indexes.

### Next up

- [ ] MS-02: conventions and branch protection.
- [ ] MS-03: Security Rules test harness.
- [ ] MS-06: app shell.
- [ ] MS-10: Security Rules.
- [ ] MS-11: `createUserProfile`.

## First-time setup (do this once)

1. Install Node.js 24. The current `functions/package.json` declares Node.js 24, so use Node.js 24 when working with the Functions emulator.

2. Install the Firebase CLI:

	```bash
	npm install -g firebase-tools
	```

	If `npm install -g` gives an EACCES permission error on Linux, do not use `sudo`. Set a user prefix, then install the CLI:

	```bash
	mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global && echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
	npm install -g firebase-tools
	```

3. Ask the project owner to add you as a member of the Firebase project, then sign in:

	```bash
	firebase login
	```

4. Clone the repository from its GitHub page. From the repository root, install the Functions dependencies:

	```bash
	cd functions
	npm install
	```

5. Do NOT run `firebase init`. The repository is already connected to the Firebase project through `.firebaserc`.

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

| Emulator | Port |
| --- | ---: |
| Authentication | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Emulator UI | 4000 |

In the Emulator UI:

- Use **Authentication** to view and manage test users.
- Use **Firestore** to view local data.
- Open **Firestore > Requests** to see which Security Rule allowed or denied a request.
- Use **Logs** to view function output.

## Where things go

The tree below reflects the current repository. A folder listed as a placeholder contains only a `.gitkeep` unless stated otherwise.

```text
.
├── *.html                    # Current pages: index, login, signup, forgot-password, mainPage
├── css/                      # Page styles
├── assets/
│   ├── avatars/              # placeholder — not built yet
│   ├── credits/              # placeholder — not built yet
│   └── img/                  # Images, including mediashelfbgidea1.png
├── js/
│   ├── firebase-config.js    # One shared Firebase setup; import auth, db, and functions from here
│   ├── constants.js          # Shared constants
│   ├── auth/                 # placeholder — not built yet
│   ├── database/             # Firestore reads and writes; placeholder — not built yet
│   ├── frontend/             # Browser-side animations and actions; placeholder — not built yet
│   └── media/                # Media-related JavaScript files
├── firestore.rules           # Firestore Security Rules
├── firestore.indexes.json    # Firestore index configuration (currently empty)
├── tests/rules/              # Rules test files; assertions and harness are placeholder — not built yet
├── functions/
│   ├── index.js              # Firebase starter scaffold; project functions are not implemented yet
│   ├── adapters/             # API adapter modules
│   └── lib/                  # Shared helper modules
├── .agents/skills/           # Firebase skills for GitHub Copilot agent mode
└── skills-lock.json          # Skill lock file
```

`js/firebase-config.js` is the one shared browser Firebase setup. Every browser script should import `auth`, `db`, and `functions` from it; never call `initializeApp` anywhere else.

The existing `js/media/` files are `entries.js`, `search.js`, and `validate.js`. Use this area for media search, adding items, status changes, and deletion as those features are built. `js/frontend/` is for browser-side behavior such as animations and actions, separate from Firebase data access. `js/database/` is for Firestore reads and writes. Both folders currently contain only `.gitkeep` files. Images belong in `assets/img/`. The `js/auth/` folder is also placeholder — not built yet; it is intended for sign-up, sign-in, sign-out, and password reset code.

The `functions/adapters/` folder has one module per external API (`tmdb.js`, `igdb.js`, `openlibrary.js`, and `musicbrainz.js`). `functions/lib/` holds shared helpers (`cache.js`, `rateLimit.js`, and `validate.js`). As Cloud Functions are implemented, keep `index.js` focused on importing and exporting functions, with each function's logic in its own file.

## How we work

1. Pick an issue for the current sprint from the GitHub Project and move it to **In Progress**.
2. Create a branch named `feature/MS-xx-short-name`.
3. Open a PR with `Closes #<issue number>` in its description. The other teammate reviews it before merging.
4. If you change the data model, update `firestore.rules` and its tests in the same PR.
5. Pull `main` often to avoid large merge conflicts.

## Rules we don't break

- Never commit API keys, `.secret.local`, or `*-firebase-adminsdk-*.json` files. The Firebase web config in `js/firebase-config.js` is public by design; that one is fine.
- Call external APIs (TMDB, IGDB, Open Library, MusicBrainz) only from Cloud Functions, never from browser code.
- Render user and API text with `textContent`, never `innerHTML`.
- Read and test AI-generated code (including Copilot and Gemini output) before trusting it, especially Security Rules.

## Common problems

**Firestore emulator won't start**

Install or check Java:

```bash
java -version
```

**Port already in use**

Stop the other emulator process or close its old terminal, then start the emulators again.

**My page can't find `firebase-config.js`**

Check the relative import path (`./` versus `../`) and make sure the script tag has `type="module"`.

**Changes aren't showing on GitHub Pages**

GitHub Pages publishes from `main` after the PR is merged. Give it a minute to update.

## Useful links

   - [GitHub Project board](https://github.com/jt4ylor10/MediaShelf)
   - [Firebase console](https://console.firebase.google.com/u/0/project/media-shelf-d46e7/overview) (you must be added as a member)
   - [PRD](https://github.com/jt4ylor10/MediaShelf)