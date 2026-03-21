import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, setDoc, getDoc, where, limit, startAt, endAt, onSnapshot } from "firebase/firestore";
import { db, auth } from "./firebase";

import { Booking, Service, BookingService, Client } from "../types";

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
    const bookingData = {
      client_id: data.client_id || null,
      client_name: data.client_name || data.name || "Unknown Client",
      client_phone: data.client_phone || data.phone || null,
      services: data.services || [],
      total_amount: data.total_amount || data.price || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "bookings"), bookingData);
    
    // Also update or create the client in the clients collection
    if (bookingData.client_name && bookingData.client_name !== "Unknown Client") {
      if (bookingData.client_id) {
        // If we have a client_id, we might want to update the client's last booking date or phone if it changed
        const clientRef = doc(db, "clients", bookingData.client_id);
        await setDoc(clientRef, {
          name: bookingData.client_name,
          phone: bookingData.client_phone,
          lastBookingAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Check if client exists by name and phone to avoid duplicates
        const clientQuery = query(
          collection(db, "clients"),
          where("name", "==", bookingData.client_name),
          where("phone", "==", bookingData.client_phone),
          limit(1)
        );
        const clientSnap = await getDocs(clientQuery);
        
        if (clientSnap.empty) {
          await addDoc(collection(db, "clients"), {
            name: bookingData.client_name,
            phone: bookingData.client_phone,
            createdAt: serverTimestamp(),
            lastBookingAt: serverTimestamp()
          });
        } else {
          // Update existing client's last booking date
          const clientDoc = clientSnap.docs[0];
          await setDoc(clientDoc.ref, {
            lastBookingAt: serverTimestamp()
          }, { merge: true });
        }
      }
    }
    
    return { booking_id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "bookings");
  }
}

export async function searchClients(queryText: string): Promise<Client[]> {
  try {
    if (!queryText || queryText.length < 2) return [];
    
    // Simple prefix search for name
    const q = query(
      collection(db, "clients"),
      orderBy("name"),
      startAt(queryText),
      endAt(queryText + '\uf8ff'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Client));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "clients");
    return [];
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

export function subscribeToBookings(callback: (bookings: any[]) => void) {
  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      booking_id: doc.id,
      ...doc.data()
    }));
    callback(bookings);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "bookings");
  });
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
    if (serviceData.service_id) {
      const serviceRef = doc(db, "services", serviceData.service_id);
      const { service_id, ...updateData } = serviceData;
      await setDoc(serviceRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return serviceData;
    } else {
      const docRef = await addDoc(collection(db, "services"), {
        ...serviceData,
        createdAt: serverTimestamp()
      });
      return { service_id: docRef.id, ...serviceData };
    }
  } catch (error) {
    handleFirestoreError(error, serviceData.service_id ? OperationType.UPDATE : OperationType.CREATE, "services");
  }
}

export async function deleteService(id: string) {
  try {
    await deleteDoc(doc(db, "services", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
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

// Expenses
export const saveExpense = async (expense: any) => {
  try {
    const docRef = await addDoc(collection(db, "expenses"), {
      ...expense,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "expenses");
  }
};

export const deleteExpense = async (id: string) => {
  try {
    await deleteDoc(doc(db, "expenses", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
  }
};

export const subscribeToExpenses = (callback: (expenses: any[]) => void) => {
  if (!auth.currentUser) return () => {};
  
  const q = query(
    collection(db, "expenses"),
    where("user_id", "==", auth.currentUser.uid),
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    callback(expenses);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "expenses");
  });
};
