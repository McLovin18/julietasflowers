/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const token = await admin.auth().verifyIdToken(header.slice(7));
    if (token.admin !== true) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { orderId, reason } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId es requerido" }, { status: 400 });
    const db = admin.firestore();
    const orderRef = db.collection("ordenes").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    const order = orderSnap.data() as any;
    if (order.estado === "aprobada") return NextResponse.json({ error: "Una orden aprobada no puede rechazarse." }, { status: 409 });
    await orderRef.update({ estado: "rechazada", estadoRazon: reason || "Rechazada por el administrador", rechazadaEn: admin.firestore.Timestamp.now() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo rechazar la transferencia." }, { status: 400 });
  }
}
