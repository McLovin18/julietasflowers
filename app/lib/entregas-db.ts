import { db } from "./firebase";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";

const CONFIG_COLLECTION = "configuracion_entrega";
const CONFIG_ID = "general";
const TARIFAS_COLLECTION = "tarifas_entrega";

export interface ConfiguracionEntrega {
  montoMinimoEntregaGratis: number;
}

export interface TarifaEntrega {
  id: string;
  tipo: "ciudad" | "zona";
  ciudad: string;
  nombre: string;
  precio?: number;
}

export const CONFIGURACION_ENTREGA_DEFAULT: ConfiguracionEntrega = {
  montoMinimoEntregaGratis: 25,
};

export async function obtenerConfiguracionEntrega(): Promise<ConfiguracionEntrega> {
  const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_ID));
  return {
    ...CONFIGURACION_ENTREGA_DEFAULT,
    ...(snapshot.exists() ? snapshot.data() : {}),
  } as ConfiguracionEntrega;
}

export async function guardarConfiguracionEntrega(configuracion: ConfiguracionEntrega): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_ID), configuracion, { merge: true });
}

export async function obtenerTarifasEntrega(): Promise<TarifaEntrega[]> {
  const snapshot = await getDocs(collection(db, TARIFAS_COLLECTION));
  return snapshot.docs
    .map((tarifa) => ({ id: tarifa.id, ...tarifa.data() } as TarifaEntrega))
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad) || a.nombre.localeCompare(b.nombre));
}

export async function guardarTarifaEntrega(
  tarifa: Omit<TarifaEntrega, "id">,
  id?: string
): Promise<void> {
  const tarifaId = id || doc(collection(db, TARIFAS_COLLECTION)).id;
  await setDoc(doc(db, TARIFAS_COLLECTION, tarifaId), tarifa);
}

export async function eliminarTarifaEntrega(id: string): Promise<void> {
  await deleteDoc(doc(db, TARIFAS_COLLECTION, id));
}

function normalizarTextoEntrega(valor: string): string {
  return valor.trim().toLocaleLowerCase();
}

export function resolverCostoEntrega(
  tarifas: TarifaEntrega[],
  ciudad: string,
  zona: string,
  subtotal: number,
  montoMinimoEntregaGratis: number
): number | null {
  if (subtotal >= montoMinimoEntregaGratis) return 0;

  const ciudadNormalizada = normalizarTextoEntrega(ciudad);
  const zonaNormalizada = normalizarTextoEntrega(zona);
  const tarifaZona = tarifas.find(
    (tarifa) => tarifa.tipo === "zona" && normalizarTextoEntrega(tarifa.ciudad) === ciudadNormalizada && normalizarTextoEntrega(tarifa.nombre) === zonaNormalizada
  );
  if (tarifaZona && tarifaZona.precio !== undefined && tarifaZona.precio !== null && Number.isFinite(Number(tarifaZona.precio))) {
    return Number(tarifaZona.precio);
  }

  const tarifaCiudad = tarifas.find(
    (tarifa) => tarifa.tipo === "ciudad" && normalizarTextoEntrega(tarifa.ciudad) === ciudadNormalizada && Number.isFinite(Number(tarifa.precio))
  );
  return tarifaCiudad ? Number(tarifaCiudad.precio) : null;
}