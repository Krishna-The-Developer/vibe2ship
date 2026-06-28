To run a local Firestore emulator for inspection:

1. Install Firebase CLI if needed:
   npm install -g firebase-tools

2. Start the emulator:
   firebase emulators:start --only auth,firestore

3. In the app, set:
   VITE_USE_FIREBASE_EMULATOR=true

4. Open the emulator UI at:
   http://127.0.0.1:4000

5. Inspect the disasters collection in Firestore Emulator UI.
