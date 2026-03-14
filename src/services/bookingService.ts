import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function saveBooking(data: any) {
  const docRef = await addDoc(collection(db, "bookings"), {
    name: data.client_name || data.name,
    phone: data.client_phone || data.phone,
    services: data.services,
    price: data.total_amount || data.price,
    date: data.date,
    createdAt: serverTimestamp()
  });
  return { booking_id: docRef.id };
}

export async function getBookings() {
  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    booking_id: doc.id,
    ...doc.data()
  }));
}

export async function deleteBooking(id: string) {
  await deleteDoc(doc(db, "bookings", id));
}

export async function getServices() {
  const querySnapshot = await getDocs(collection(db, "services"));
  return querySnapshot.docs.map(doc => ({
    service_id: doc.id,
    ...doc.data()
  }));
}

export async function saveService(serviceData: any) {
  const docRef = await addDoc(collection(db, "services"), {
    ...serviceData,
    createdAt: serverTimestamp()
  });
  return { service_id: docRef.id, ...serviceData };
}

export async function saveAvailability(availability: any) {
  const docRef = doc(db, "settings", "availability");
  await setDoc(docRef, {
    availability,
    updatedAt: serverTimestamp()
  });
}

export async function getAvailability() {
  const docRef = doc(db, "settings", "availability");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().availability;
  }
  return null;
}
