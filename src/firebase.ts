import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

try {
  const metaEnv = (import.meta as any).env || {};
  const config = {
    apiKey: metaEnv.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '',
    authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '',
    projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '',
    storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '',
    messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '',
    appId: metaEnv.VITE_FIREBASE_APP_ID || rawConfig.appId || '',
  };

  if (config.apiKey) {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    authInstance = getAuth(app);
    const dbId = rawConfig.firestoreDatabaseId || metaEnv.VITE_FIRESTORE_DATABASE_ID;
    dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization skipped or failed:', error);
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export default app;

