import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildTime1234567890",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:1234567890abcdef",
};

const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("DummyKey")
);

const isClient = typeof window !== "undefined";

const app = isClient 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : ({} as any);

export const auth = isClient ? getAuth(app) : ({} as any);

let firestoreDb;
if (isClient) {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    firestoreDb = getFirestore(app);
  }
} else {
  firestoreDb = {} as any;
}

export const db = firestoreDb;
export const storage = isClient ? getStorage(app) : ({} as any);
export const googleProvider = isClient ? new GoogleAuthProvider() : ({} as any);

export function ensureFirebaseConfigured(operation: string): void {
  if (!isFirebaseConfigured) {
    throw new Error(
      `${operation} failed because Firebase is not configured yet.`
    );
  }
}

export function getFirebaseConnectionMessage(): string {
  return isFirebaseConfigured
    ? "Firebase is connected."
    : "Firebase is not configured yet.";
}

export default app;
