import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration for Army Public School Voting System (aps-voting)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || "aps-voting"}-default-rtdb.firebaseio.com`,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore> | null = null;
let rtdb: ReturnType<typeof getDatabase> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);

  try {
    rtdb = getDatabase(app);
  } catch (err) {
    console.warn("Firebase Realtime Database init warning:", err);
  }

  if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch(err => {
      console.warn("Firebase Analytics check failed:", err);
    });
  }
} catch (error) {
  console.warn("Firebase initialization warning:", error);
  db = null;
}

export { app, db, rtdb, analytics, firebaseConfig };
