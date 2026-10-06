import { db } from "./firebase";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp
} from "firebase/firestore";

const COLLECTION = "eventos_especiales";

export interface EventoEspecial {
  id: string;
  nombre: string;
  fecha: Date; // Fecha del evento (ej: 14 de febrero para San Valentín)
  activo: boolean;
  createdAt?: Date;
}

// Obtener todos los eventos especiales activos
export async function obtenerEventosEspeciales(): Promise<EventoEspecial[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("fecha", "asc"))
  );
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha)
    } as EventoEspecial;
  });
}

// Obtener solo eventos activos
export async function obtenerEventosActivos(): Promise<EventoEspecial[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("activo", "==", true),
      orderBy("fecha", "asc")
    )
  );
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha)
    } as EventoEspecial;
  });
}

// Crear evento especial
export async function crearEventoEspecial(
  nombre: string,
  fecha: Date
): Promise<void> {
  const id = nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await setDoc(doc(db, COLLECTION, id), {
    nombre,
    fecha: Timestamp.fromDate(fecha),
    activo: true,
    createdAt: Timestamp.now()
  });
}

// Actualizar evento especial
export async function actualizarEventoEspecial(
  id: string,
  nombre: string,
  fecha: Date,
  activo: boolean
): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), {
    nombre,
    fecha: Timestamp.fromDate(fecha),
    activo
  }, { merge: true });
}

// Eliminar evento especial
export async function eliminarEventoEspecial(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Obtener evento por ID
export async function obtenerEventoPorId(id: string): Promise<EventoEspecial | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha)
  } as EventoEspecial;
}
