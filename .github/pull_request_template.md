## Summary

<!-- What does this PR do, and why? 1-3 sentences. -->

## Linked Work Item

<!-- Tie this PR back to the Product Backlog / Sprint Backlog. -->

- Closes #<issue-number>
- Sprint: <number>
- Tier: <!-- delete the ones that don't apply --> MVP / Target Range / Ambitious Version

## Modules Touched

<!-- Check every module this PR changes. -->

- [ ] Frontend (HTML / CSS / JavaScript)
- [ ] Authentication (Firebase Authentication)
- [ ] Media Management (add, edit, delete, rate, filter, validation)
- [ ] Database (Firestore service layer)
- [ ] Security Rules (Firestore Security Rules)
- [ ] API Proxy (Firebase Cloud Functions)
- [ ] Hosting / Deployment (GitHub Pages)
- [ ] Docs / Config only

## Changes

-
-

## How to Test

<!-- Steps a reviewer can follow to verify this works. Include test account details if needed (never real passwords). -->

1.
2.
3.

**Expected result:**

## Screenshots / Recordings

<!-- Required for any UI change. Include desktop AND mobile views if layout changed. -->

## Checklist

### General

- [ ] Code runs locally without console errors
- [ ] I started from an up-to-date `main` and resolved any merge conflicts
- [ ] Changes are limited to this work item (no unrelated edits)
- [ ] Docs / comments updated where needed

### Security & Privacy

- [ ] No API keys, secrets, or credentials are in the code or committed files
- [ ] External API and AI calls go through the API Proxy (not directly from the browser)
- [ ] Firestore Security Rules enforce access (users can only read/write what they should)
- [ ] Privacy settings are respected (public / friends-only / private), if relevant

### Quality

- [ ] Input is validated (empty fields, bad values, duplicates)
- [ ] Loading and error states handle slow or failed external API calls
- [ ] Layout works on desktop and mobile, if UI changed
- [ ] Tested create, edit, and delete paths for any data I touched
- [ ] Tested logged-in and logged-out behavior

## AI Usage

<!-- Our team uses AI tooling. Be upfront so reviewers know what to double-check. -->

- [ ] No AI used for this PR
- [ ] AI helped with: <!-- code / tests / debugging / docs -->
- [ ] I read, understood, and tested all AI-generated code before submitting

## Notes for Reviewers

<!-- Anything tricky, known limitations, follow-up tasks, or specific areas you want feedback on. -->

## Reviewer Checklist

- [ ] Code is readable and follows the project's structure
- [ ] Pulled the branch and tested it myself
- [ ] No security or privacy concerns
