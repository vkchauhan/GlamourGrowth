import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { ArtistProfile } from "../types";

const PROFILE_COLLECTION = "artist_profiles";

export async function getProfile(): Promise<ArtistProfile | null> {
  if (!auth.currentUser) return null;
  
  try {
    const docRef = doc(db, PROFILE_COLLECTION, auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as ArtistProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export async function saveProfile(profile: ArtistProfile): Promise<void> {
  if (!auth.currentUser) return;
  
  try {
    const docRef = doc(db, PROFILE_COLLECTION, auth.currentUser.uid);
    await setDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
}

export function subscribeToProfile(callback: (profile: ArtistProfile | null) => void) {
  if (!auth.currentUser) {
    callback(null);
    return () => {};
  }
  
  const docRef = doc(db, PROFILE_COLLECTION, auth.currentUser.uid);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as ArtistProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Profile subscription error:", error);
  });
}
