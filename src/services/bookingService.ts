import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveBooking(data: any) {
  try {
    const docRef = await addDoc(collection(db, "bookings"), {
      name: data.client_name || data.name,
      phone: data.client_phone || data.phone,
      services: data.services,
      price: data.total_amount || data.price,
      date: data.date,
      createdAt: serverTimestamp()
    });
    return { booking_id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "bookings");
  }
}

export async function getBookings() {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      booking_id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "bookings");
  }
}

export async function deleteBooking(id: string) {
  try {
    await deleteDoc(doc(db, "bookings", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
  }
}

export async function getServices() {
  try {
    const querySnapshot = await getDocs(collection(db, "services"));
    return querySnapshot.docs.map(doc => ({
      service_id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "services");
  }
}

export async function saveService(serviceData: any) {
  try {
    const docRef = await addDoc(collection(db, "services"), {
      ...serviceData,
      createdAt: serverTimestamp()
    });
    return { service_id: docRef.id, ...serviceData };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "services");
  }
}

export async function saveAvailability(availability: any) {
  try {
    const docRef = doc(db, "settings", "availability");
    await setDoc(docRef, {
      availability,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings/availability");
  }
}

export async function getAvailability() {
  try {
    const docRef = doc(db, "settings", "availability");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().availability;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "settings/availability");
  }
}
