/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";
import { applyStockDeltaToProduct } from "../../../lib/order-checkout-utils";

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const token = await admin.auth().verifyIdToken(header.slice(7));
    if (token.admin !== true) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { orderId, reason } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId es requerido" }, { status: 400 });
    const db = admin.firestore();

    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("ordenes").doc(orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new Error("Orden no encontrada");
      const order = orderSnap.data() as any;
      if (order.estado === "aprobada") throw new Error("Una orden aprobada no puede rechazarse.");

      const now = admin.firestore.Timestamp.now();

      // Liberar stock si estaba reservado
      if (order.stockReserved && order.metodoPago === "transferencia") {
        const items = Array.isArray(order.productos) ? order.productos : [];
        const productRefs = items.map((item: any) => db.collection("productos").doc(item.id));
        const productSnaps = await transaction.getAll(...productRefs);
        const stockUpdates = productSnaps.map((productSnap, index) => {
          if (!productSnap.exists) throw new Error(`Producto no encontrado: ${items[index]?.id}`);
          const item = items[index];
          const nextStock = applyStockDeltaToProduct({ id: productSnap.id, ...productSnap.data() }, item, Number(item.cantidad || 1));
          return { productSnap, item, nextStock };
        });

        for (const { productSnap, item, nextStock } of stockUpdates) {
          transaction.update(productSnap.ref, { ...nextStock, lastStockUpdateAt: now });
          transaction.set(productSnap.ref.collection("stock_history").doc(`transfer_rejected_${order.orderId}_${Date.now()}`), {
            type: "transfer_rejected",
            cantidad: Number(item.cantidad || 1),
            orderId: order.orderId,
            timestamp: now,
          });
        }
      }

      transaction.update(orderRef, {
        estado: "rechazada",
        estadoRazon: reason || "Rechazada por el administrador",
        rechazadaEn: now,
        stockReserved: false,
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo rechazar la transferencia." }, { status: 400 });
  }
}
