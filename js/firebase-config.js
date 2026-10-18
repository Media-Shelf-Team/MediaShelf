// shared firebase setup for the client-side code
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-functions.js";

const firebaseConfig = { 
  apiKey: "AIzaSyCqQxFUSXnZNnU8pooEG5CIObs5sNmFMGg",
  authDomain: "media-shelf-d46e7.firebaseapp.com",
  projectId: "media-shelf-d46e7",
  storageBucket: "media-shelf-d46e7.firebasestorage.app",
  messagingSenderId: "1078096535155",
  appId: "1:1078096535155:web:8334ab607a1bf556fa1406",
  measurementId: "G-61JM7HVB81"
 };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Use local emulators when running on localhost
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}