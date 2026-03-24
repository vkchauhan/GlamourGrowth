import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, setDoc, getDoc, where, limit, startAt, endAt, onSnapshot, increment, updateDoc } from "firebase/firestore";
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
      advance_paid: data.advance_paid || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || "",
      location: data.location || "",
      status: data.status || 'confirmed',
      photos: data.photos || [],
      sessionNotes: data.sessionNotes || "",
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "bookings"), bookingData);
    
    // Also update or create the client in the clients collection
    if (bookingData.client_name && bookingData.client_name !== "Unknown Client" && bookingData.status === 'completed') {
      if (bookingData.client_id) {
        // If we have a client_id, update the client's stats
        const clientRef = doc(db, "clients", bookingData.client_id);
        await updateDoc(clientRef, {
          name: bookingData.client_name,
          phone: bookingData.client_phone,
          lastBookingAt: serverTimestamp(),
          totalSpend: increment(bookingData.total_amount),
          visitCount: increment(1)
        });
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
            name_lowercase: bookingData.client_name.toLowerCase(),
            phone: bookingData.client_phone,
            createdAt: serverTimestamp(),
            lastBookingAt: serverTimestamp(),
            totalSpend: bookingData.total_amount,
            visitCount: 1,
            skinType: "",
            preferences: "",
            notes: ""
          });
        } else {
          // Update existing client's stats
          const clientDoc = clientSnap.docs[0];
          await updateDoc(clientDoc.ref, {
            name_lowercase: bookingData.client_name.toLowerCase(),
            lastBookingAt: serverTimestamp(),
            totalSpend: increment(bookingData.total_amount),
            visitCount: increment(1)
          });
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
    
    const lowerQuery = queryText.toLowerCase();
    
    // Try searching by name_lowercase first
    let q = query(
      collection(db, "clients"),
      orderBy("name_lowercase"),
      startAt(lowerQuery),
      endAt(lowerQuery + '\uf8ff'),
      limit(10)
    );
    
    let querySnapshot = await getDocs(q);
    
    // If no results, try the original name field (for legacy data)
    if (querySnapshot.empty) {
      // We can't easily do case-insensitive prefix search on the original name field in Firestore
      // So we'll fetch a few and filter in memory as a fallback
      const fallbackQ = query(collection(db, "clients"), limit(100));
      const fallbackSnap = await getDocs(fallbackQ);
      return fallbackSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .filter(c => c.name.toLowerCase().startsWith(lowerQuery))
        .slice(0, 10);
    }
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Client));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "clients");
    return [];
  }
}

export async function getClients(): Promise<Client[]> {
  try {
    const q = query(collection(db, "clients"), orderBy("name"));
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

export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const docRef = doc(db, "clients", clientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Client;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `clients/${clientId}`);
    return null;
  }
}

export async function updateClientProfile(clientId: string, data: Partial<Client>) {
  try {
    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
  }
}

export async function getClientHistory(clientId: string): Promise<Booking[]> {
  try {
    // We need to find bookings where client_id matches OR name/phone matches if client_id was null
    // For simplicity, let's assume client_id is always set if we're in the profile
    const q = query(
      collection(db, "bookings"),
      where("client_id", "==", clientId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      booking_id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "bookings");
    return [];
  }
}

export async function getBookings(): Promise<Booking[]> {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      booking_id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "bookings");
    return [];
  }
}

export function subscribeToBookings(callback: (bookings: any[]) => void) {
  const q = query(collection(db, "bookings"), orderBy("date", "desc"), orderBy("createdAt", "desc"));
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

export function subscribeToUpcomingBookings(callback: (bookings: Booking[]) => void) {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, "bookings"),
    where("status", "in", ["confirmed", "inquiry"]),
    where("date", ">=", today),
    orderBy("date", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      booking_id: doc.id,
      ...doc.data()
    } as Booking));
    callback(bookings);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "bookings");
  });
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']) {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, { status, updatedAt: serverTimestamp() });
    
    // If completed, we might want to update client stats here as well
    if (status === 'completed') {
      const snap = await getDoc(bookingRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.client_id) {
          const clientRef = doc(db, "clients", data.client_id);
          await updateDoc(clientRef, {
            lastBookingAt: serverTimestamp(),
            totalSpend: increment(data.total_amount),
            visitCount: increment(1)
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
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
      createdAt: expense.createdAt || new Date().toISOString()
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
