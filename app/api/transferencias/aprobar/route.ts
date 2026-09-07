/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";
import { applyStockDeltaToProduct } from "../../../lib/order-checkout-utils";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  try {
    const token = await admin.auth().verifyIdToken(header.slice(7));
    return token.admin === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId es requerido" }, { status: 400 });
    const db = admin.firestore();
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("ordenes").doc(orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new Error("Orden no encontrada");
      const order = orderSnap.data() as any;
      if (order.estado === "aprobada") return { alreadyApproved: true, orderId: order.orderId };
      if (order.estado !== "transferencia_pendiente") throw new Error(`La orden no está pendiente de transferencia: ${order.estado}`);

      const items = Array.isArray(order.productos) ? order.productos : [];
      const productRefs = items.map((item: any) => db.collection("productos").doc(item.id));
      const productSnaps = await transaction.getAll(...productRefs);
      const updates = productSnaps.map((productSnap, index) => {
        if (!productSnap.exists) throw new Error(`Producto no encontrado: ${items[index]?.id}`);
        const item = items[index];
        const nextStock = applyStockDeltaToProduct({ id: productSnap.id, ...productSnap.data() }, item, -Number(item.cantidad || 1));
        return { productSnap, item, nextStock };
      });

      const now = admin.firestore.Timestamp.now();
      for (const { productSnap, item, nextStock } of updates) {
        transaction.update(productSnap.ref, { ...nextStock, lastStockUpdateAt: now });
        transaction.set(productSnap.ref.collection("stock_history").doc(`transfer_${order.orderId}_${Date.now()}`), {
          type: "transfer_approved",
          cantidad: -Number(item.cantidad || 1),
          orderId: order.orderId,
          timestamp: now,
        });
      }
      transaction.update(orderRef, {
        estado: "aprobada",
        aprobadoEn: now,
        stockReserved: true,
        stockReservedAt: now,
      });
      return { alreadyApproved: false, orderId: order.orderId };
    });
    if (!result.alreadyApproved) {
      after(async () => {
        try {
          const { notificarCompraAprobada } = await import("../../../lib/transferencia-email");
          await notificarCompraAprobada(orderId);
        } catch (emailError) {
          console.error("[transferencias/aprobar] Compra aprobada, pero falló el correo al cliente:", emailError);
          await db.collection("ordenes").doc(orderId).update({ notificacionCliente: "fallida" });
        }
      });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[transferencias/aprobar]", error);
    return NextResponse.json({ error: error.message || "No se pudo aprobar la transferencia." }, { status: 400 });
  }
}
