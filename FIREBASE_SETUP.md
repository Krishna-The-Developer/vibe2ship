Firebase setup for disaster persistence

1. Open your Firebase project: smart-disaster-manager
2. Go to Firestore Database and make sure it is created.
3. In Rules, use the latest rules from firestore.rules.
4. If the project still refuses writes, create a new Firestore database in the same project and keep the same projectId in firebase-applet-config.json.
5. After deployment, refresh the app and trigger a disaster event.
