// Last-Minute Life Saver - Constants
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const GEMINI_API_KEY = "PLACEHOLDER_FOR_GEMINI_API_KEY";

// Modern Productivity Color Palette
export const COLORS = {
  primaryBlue: "#3b82f6", // Calm, focus, stability
  alertOrange: "#f97316", // Urgency, action, panic control
  successGreen: "#22c55e", // Accomplishment, completed, relief
  motivationalPurple: "#a855f7", // Inspiration, high-energy drive
};

const env = import.meta.env;

const resolveFirebaseValue = (envKey: string, fallback: string) => {
  const value = env[envKey];
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
};

// Firebase Configuration from firebase-applet-config.json or VITE_FIREBASE_* env vars
export const FIREBASE_CONFIG = {
  apiKey: resolveFirebaseValue("VITE_FIREBASE_API_KEY", firebaseAppletConfig.apiKey || ""),
  authDomain: resolveFirebaseValue("VITE_FIREBASE_AUTH_DOMAIN", firebaseAppletConfig.authDomain || ""),
  projectId: resolveFirebaseValue("VITE_FIREBASE_PROJECT_ID", firebaseAppletConfig.projectId || ""),
  storageBucket: resolveFirebaseValue("VITE_FIREBASE_STORAGE_BUCKET", firebaseAppletConfig.storageBucket || ""),
  messagingSenderId: resolveFirebaseValue("VITE_FIREBASE_MESSAGING_SENDER_ID", firebaseAppletConfig.messagingSenderId || ""),
  appId: resolveFirebaseValue("VITE_FIREBASE_APP_ID", firebaseAppletConfig.appId || ""),
  measurementId: resolveFirebaseValue("VITE_FIREBASE_MEASUREMENT_ID", firebaseAppletConfig.measurementId || "")
};

export const FIREBASE_DATABASE_ID = resolveFirebaseValue(
  "VITE_FIRESTORE_DATABASE_ID",
  firebaseAppletConfig.firestoreDatabaseId || ""
);

