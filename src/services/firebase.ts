import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (!process.env.VITE_FIREBASE_API_KEY) {
    throw new Error("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in your environment variables.");
  }
  
  if (getApps().length > 0) {
    return getApp();
  }
  
  return initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
};

// For backward compatibility if needed, but we should use getFirebaseAuth()
// Exporting a getter-based auth object or just the function is safer.
// However, many components might already be importing { auth }.
// Let's use a Proxy for the 'auth' export to handle lazy initialization.

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getFirebaseAuth();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export { RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult, User };
