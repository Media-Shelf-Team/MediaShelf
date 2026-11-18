// Fills in the profile on My Shelf: name, username, join date, bio, avatar
// pictures and the shelf stats.
//
// It imports signedInUser from the page guard, so it only runs once the
// guard has confirmed the user and their profile.
import {signedInUser} from '../auth/signedInPage.js';
import {getBio, getUserCard, getUsername} from '../database/profile.js';
import {countEntries} from '../database/entries.js';
import {avatarSrc} from './display.js';
import {todayLocal} from '../media/validate.js';
import {SHELF_CHANGED_EVENT} from '../constants.js';

/**
 * Sets the text of every element matching a selector.
 * @param {string} selector CSS selector.
 * @param {string} text The text to show.
 */
function setText(selector, text) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = text;
  });
}

/**
 * "Joined Nov 2026", from when the Auth account was created. (users/{uid}
 * has no createdAt field, and the rules don't allow adding one.)
 * @param {Object} user The signed-in Firebase user.
 * @return {string} '' if the date is missing.
 */
function joinedText(user) {
  const created = new Date(user.metadata.creationTime);
  if (Number.isNaN(created.getTime())) return '';
  const monthAndYear = created.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  return `Joined ${monthAndYear}`;
}

/**
 * A stat as shown on the page: "100+" when the count hit the query limit.
 * @param {{count: number, capped: boolean}} result From countEntries().
 * @return {string}
 */
function statText({count, capped}) {
  return capped ? `${count}+` : String(count);
}

/**
 * Shows the bio, or an "Add a bio" button that opens Edit profile.
 * @param {string} bio The user's bio ('' when empty).
 */
function showBio(bio) {
  const bioEl = document.querySelector('.profile__bio');
  if (bio) {
    bioEl.textContent = bio;
    return;
  }
  // custAndSettingsModal.js opens Edit profile for any [data-open-settings].
  const prompt = document.createElement('button');
  prompt.type = 'button';
  prompt.className = 'profile__bio-prompt';
  prompt.dataset.openSettings = 'customization';
  prompt.textContent = 'Add a bio';
  bioEl.replaceChildren(prompt);
}

/**
 * Name and avatar (users/{uid}), shown in the header menu and the profile.
 * @param {string} uid The signed-in user's ID.
 */
async function loadCard(uid) {
  const card = await getUserCard(uid);
  if (!card) return; // the guard already checked, so this shouldn't happen
  setText('.user-menu__name, .profile__name', card.displayName);
  document
    .querySelectorAll('.avatar-btn__img, .user-menu__avatar, .profile__avatar')
    .forEach((img) => {
      img.src = avatarSrc(card.avatarId);
    });
}

/**
 * Username (private/account), shown as @username.
 * @param {string} uid The signed-in user's ID.
 */
async function loadUsername(uid) {
  const username = await getUsername(uid);
  if (username)
    setText('.user-menu__handle, .profile__username', `@${username}`);
}

/**
 * The bio (profile/details).
 * @param {string} uid The signed-in user's ID.
 */
async function loadBio(uid) {
  showBio(await getBio(uid));
}

/**
 * The Logged and This month stats.
 * @param {string} uid The signed-in user's ID.
 */
async function loadStats(uid) {
  // The first day of this month in the user's time zone, e.g. '2026-11-01'.
  const firstOfMonth = `${todayLocal().slice(0, 8)}01`;
  const [logged, thisMonth] = await Promise.all([
    countEntries(uid),
    countEntries(uid, {since: firstOfMonth}),
  ]);
  setText('#stat-logged', statText(logged));
  setText('#stat-this-month', statText(thisMonth));
}

if (signedInUser) {
  const uid = signedInUser.uid;
  setText('.profile__joined', joinedText(signedInUser));

  // Each part loads on its own, so one failure doesn't blank the others.
  const parts = [loadCard, loadUsername, loadBio, loadStats];
  for (const load of parts) {
    load(uid).catch((error) => {
      console.error(`My Shelf: ${load.name} failed`, error);
    });
  }

  // Keep the stats current after a log is added, edited or deleted.
  document.addEventListener(SHELF_CHANGED_EVENT, () => {
    loadStats(uid).catch((error) => {
      console.error('My Shelf: loadStats failed', error);
    });
  });
}
