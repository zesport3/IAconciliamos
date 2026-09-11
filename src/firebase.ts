import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

try {
  const metaEnv = (import.meta as any).env || {};
  const apiKey = metaEnv.VITE_FIREBASE_API_KEY || '';
  if (apiKey) {
    const config = {
      apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
    };
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    authInstance = getAuth(app);
    const dbId = metaEnv.VITE_FIRESTORE_DATABASE_ID;
    dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization skipped or failed:', error);
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export default app;


