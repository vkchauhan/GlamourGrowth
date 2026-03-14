import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User, Auth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

function getFirebaseApp(): FirebaseApp {
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

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getFirebaseAuth();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export { RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult, User };
