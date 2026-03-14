import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export { RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult, User };
