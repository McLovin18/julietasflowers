/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";
import { buildOrderProductLine } from "../../../lib/order-checkout-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, customerEmail, productos, ciudadEntrega, zonaEntrega, deliveryCost, cuentaId, evidenceUrl } = body;
    if (!customerName?.trim() || !customerPhone?.trim() || !customerEmail?.trim() || !Array.isArray(productos) || productos.length === 0 || !ciudadEntrega || !zonaEntrega || !cuentaId || !evidenceUrl) {
      return NextResponse.json({ error: "Completa todos los datos y adjunta la evidencia de pago." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(customerEmail.trim())) {
      return NextResponse.json({ error: "El correo electrónico no es válido." }, { status: 400 });
    }

    const db = admin.firestore();
    const accountSnap = await db.collection("cuentas_bancarias").doc(cuentaId).get();
    if (!accountSnap.exists || accountSnap.data()?.activa === false) {
      return NextResponse.json({ error: "La cuenta bancaria seleccionada ya no está disponible." }, { status: 400 });
    }

    const productRefs = productos.map((item: any) => db.collection("productos").doc(item.id));
    const productSnaps = await db.getAll(...productRefs);
    const dataById = new Map(productSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
    const processedProducts = productos.map((item: any) => {
      const productData = dataById.get(item.id);
      if (!productData) throw new Error(`Producto no encontrado: ${item.id}`);
      return buildOrderProductLine(item, { ...productData, id: item.id });
    });
    const calculatedSubtotal = processedProducts.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
    const shipping = Math.max(0, Number(deliveryCost || 0));
    const orderTotal = Math.round((calculatedSubtotal + shipping) * 100) / 100;

    const counterRef = db.collection("ordenes_meta").doc("counter");
    const orderRef = db.collection("ordenes").doc();
    const orderData = await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const nextNumber = Number(counterSnap.data()?.lastNumber || 0) + 1;
      const orderId = `ord-${String(nextNumber).padStart(5, "0")}`;
      const now = admin.firestore.Timestamp.now();
      const data = {
        orderId,
        userId: body.userId || "guest",
        estado: "transferencia_pendiente",
        metodoPago: "transferencia",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        email: customerEmail.trim(),
        ciudadEntrega,
        zonaEntrega,
        subtotal: calculatedSubtotal,
        costoEntrega: shipping,
        total: orderTotal,
        productos: processedProducts,
        cuentaBancaria: { id: accountSnap.id, ...accountSnap.data() },
        evidenceUrl,
        stockReserved: false,
        notificacionCorreo: "pendiente",
        createdAt: now,
      };
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      transaction.set(orderRef, data);
      return { ...data, id: orderRef.id };
    });

    // Fire-and-forget del servidor: se ejecuta despues de responder, pero no depende del navegador.
    after(async () => {
      try {
        const { notificarTransferencia } = await import("../../../lib/transferencia-email");
        await notificarTransferencia(orderData.id);
      } catch (emailError) {
        console.error("[transferencias/crear] La orden quedo guardada, pero fallo el correo:", emailError);
        await db.collection("ordenes").doc(orderData.id).update({ notificacionCorreo: "fallida" });
      }
    });

    return NextResponse.json({ success: true, orderId: orderData.orderId, id: orderData.id });
  } catch (error: any) {
    console.error("[transferencias/crear]", error);
    return NextResponse.json({ error: error.message || "No se pudo registrar la transferencia." }, { status: 400 });
  }
}
