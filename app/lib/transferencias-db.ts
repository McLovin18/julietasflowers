import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface CuentaBancaria {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  identificacion?: string;
  correo?: string;
}

export async function obtenerCuentasBancarias(): Promise<CuentaBancaria[]> {
  const snapshot = await getDocs(collection(db, "cuentas_bancarias"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as CuentaBancaria))
    .filter((cuenta) => cuenta.banco && cuenta.numeroCuenta && cuenta.titular);
}
