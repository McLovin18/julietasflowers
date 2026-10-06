import { db } from "./firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";

const COLLECTION = "reservas";

export interface Reserva {
  id: string;
  codigo: string; // 6-digit code
  nombreCliente: string;
  email: string;
  eventoId?: string; // ID del evento especial (si aplica)
  nombreEventoPersonalizado?: string; // Si es evento personalizado
  fechaEvento: Date;
  fechaReserva: Date;
  recordatorioEnviado: boolean;
  recordatorioAutomaticoEnviado: boolean;
  createdAt?: Date;
}

// Generar código de 6 dígitos
export function generarCodigoReserva(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Crear reserva
export async function crearReserva(
  nombreCliente: string,
  email: string,
  eventoId?: string,
  nombreEventoPersonalizado?: string,
  fechaEvento?: Date
): Promise<Reserva> {
  const codigo = generarCodigoReserva();
  const id = `res_${codigo}`;
  
  const fecha = fechaEvento || new Date();
  
  const reservaData: any = {
    codigo,
    nombreCliente,
    email,
    fechaEvento: Timestamp.fromDate(fecha),
    fechaReserva: Timestamp.now(),
    recordatorioEnviado: false,
    recordatorioAutomaticoEnviado: false,
    createdAt: Timestamp.now()
  };

  if (eventoId) {
    reservaData.eventoId = eventoId;
  }

  if (nombreEventoPersonalizado) {
    reservaData.nombreEventoPersonalizado = nombreEventoPersonalizado;
  }

  await setDoc(doc(db, COLLECTION, id), reservaData);

  return {
    id,
    codigo,
    nombreCliente,
    email,
    eventoId,
    nombreEventoPersonalizado,
    fechaEvento: fecha,
    fechaReserva: new Date(),
    recordatorioEnviado: false,
    recordatorioAutomaticoEnviado: false,
    createdAt: new Date()
  };
}

// Obtener reserva por código
export async function obtenerReservaPorCodigo(codigo: string): Promise<Reserva | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("codigo", "==", codigo))
  );
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    fechaEvento: data.fechaEvento?.toDate ? data.fechaEvento.toDate() : new Date(data.fechaEvento),
    fechaReserva: data.fechaReserva?.toDate ? data.fechaReserva.toDate() : new Date(data.fechaReserva),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
  } as Reserva;
}

// Obtener todas las reservas
export async function obtenerReservas(): Promise<Reserva[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("fechaEvento", "asc"))
  );
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      fechaEvento: data.fechaEvento?.toDate ? data.fechaEvento.toDate() : new Date(data.fechaEvento),
      fechaReserva: data.fechaReserva?.toDate ? data.fechaReserva.toDate() : new Date(data.fechaReserva),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    } as Reserva;
  });
}

// Obtener reservas que necesitan recordatorio automático (2 días antes)
export async function obtenerReservasParaRecordatorio(): Promise<Reserva[]> {
  const ahora = new Date();
  const dosDiasDespues = new Date(ahora.getTime() + 2 * 24 * 60 * 60 * 1000);
  const finDelDia = new Date(dosDiasDespues);
  finDelDia.setHours(23, 59, 59, 999);
  
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("recordatorioAutomaticoEnviado", "==", false),
      where("fechaEvento", "<=", Timestamp.fromDate(finDelDia))
    )
  );
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      fechaEvento: data.fechaEvento?.toDate ? data.fechaEvento.toDate() : new Date(data.fechaEvento),
      fechaReserva: data.fechaReserva?.toDate ? data.fechaReserva.toDate() : new Date(data.fechaReserva),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    } as Reserva;
  });
}

// Marcar recordatorio como enviado
export async function marcarRecordatorioEnviado(reservaId: string, esAutomatico: boolean = false): Promise<void> {
  await setDoc(doc(db, COLLECTION, reservaId), {
    [esAutomatico ? "recordatorioAutomaticoEnviado" : "recordatorioEnviado"]: true
  }, { merge: true });
}

// Eliminar reserva
export async function eliminarReserva(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
