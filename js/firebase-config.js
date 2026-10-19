// shared firebase setup for the client-side code
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {
  getAuth,
  connectAuthEmulator,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {
  getFunctions,
  connectFunctionsEmulator,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-functions.js';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app-check.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCqQxFUSXnZNnU8pooEG5CIObs5sNmFMGg',
  authDomain: 'media-shelf-d46e7.firebaseapp.com',
  projectId: 'media-shelf-d46e7',
  storageBucket: 'media-shelf-d46e7.firebasestorage.app',
  messagingSenderId: '1078096535155',
  appId: '1:1078096535155:web:8334ab607a1bf556fa1406',
  measurementId: 'G-61JM7HVB81',
};

const isLocal =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

export const app = initializeApp(firebaseConfig);

// App Check: proves requests come from this site. Must run before any
// Cloud Function is called. On localhost, a debug token is used instead of
// reCAPTCHA; it is printed in the browser console and must be registered in
// the Firebase console (App Check > Apps > Manage debug tokens).
if (isLocal) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
export const appCheck = initializeAppCheck(app, {
  // reCAPTCHA Enterprise site key: public by design (restricted by domain).
  provider: new ReCaptchaEnterpriseProvider(
    '6LeuGfYtAAAAAON4fwUkUacgavV0WfNRSrDhXykC',
  ),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Use local emulators when running on localhost
if (isLocal) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
