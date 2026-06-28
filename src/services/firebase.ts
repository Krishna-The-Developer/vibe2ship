import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { FIREBASE_CONFIG, FIREBASE_DATABASE_ID } from '../utils/constants';

// Initialize Firebase App
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore using the configured database ID when present
export const db = FIREBASE_DATABASE_ID
  ? getFirestore(app, FIREBASE_DATABASE_ID)
  : getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  } catch {
    // Emulator connection is safe to ignore on hot reloads.
  }

  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    // Emulator connection is safe to ignore on hot reloads.
  }
}

export default app;
