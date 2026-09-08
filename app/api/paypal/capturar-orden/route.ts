/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";
import { applyStockDeltaToProduct } from "../../../lib/order-checkout-utils";
import { paypalRequest } from "../../../lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId } = await req.json();
    if (!paypalOrderId) return NextResponse.json({ error: "paypalOrderId es requerido." }, { status: 400 });
    const db = admin.firestore();
    const checkoutRef = db.collection("paypal_checkouts").doc(paypalOrderId);
    const checkoutSnap = await checkoutRef.get();
    if (!checkoutSnap.exists) return NextResponse.json({ error: "Checkout de PayPal no encontrado." }, { status: 404 });
    const checkout = checkoutSnap.data() as any;
    if (checkout.estado === "capturada") return NextResponse.json({ success: true, orderId: checkout.orderId, alreadyCaptured: true });

    const capture = await paypalRequest(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST" });
    const captureStatus = capture.status || capture.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    if (captureStatus !== "COMPLETED") throw new Error("PayPal no confirmó el pago.");
    const paypalCustomerEmail = capture.payer?.email_address || checkout.customerEmail || null;

    const result = await db.runTransaction(async (transaction) => {
      const freshCheckout = await transaction.get(checkoutRef);
      const freshData = freshCheckout.data() as any;
      if (freshData?.estado === "capturada") return { orderId: freshData.orderId, created: false };
      const items = freshData.productos || [];
      const productRefs = items.map((item: any) => db.collection("productos").doc(item.id));
      const productSnaps = await transaction.getAll(...productRefs);
      const updates = productSnaps.map((snapshot, index) => {
        if (!snapshot.exists) throw new Error(`Producto no encontrado: ${items[index]?.id}`);
        const item = items[index];
        return { snapshot, nextStock: applyStockDeltaToProduct({ id: snapshot.id, ...snapshot.data() }, item, -Number(item.cantidad || 1)), item };
      });
      const counterRef = db.collection("ordenes_meta").doc("counter");
      const counterSnap = await transaction.get(counterRef);
      const nextNumber = Number(counterSnap.data()?.lastNumber || 0) + 1;
      const orderId = `ord-${String(nextNumber).padStart(5, "0")}`;
      const now = admin.firestore.Timestamp.now();
      for (const update of updates) transaction.update(update.snapshot.ref, { ...update.nextStock, lastStockUpdateAt: now });
      const orderRef = db.collection("ordenes").doc();
      transaction.set(orderRef, { orderId, estado: "aprobada", metodoPago: "paypal", paypalOrderId, paypalCaptureId: capture.id, productos: items, subtotal: freshData.subtotal, costoEntrega: freshData.costoEntrega, total: freshData.total, ciudadEntrega: freshData.ciudadEntrega, zonaEntrega: freshData.zonaEntrega, customerEmail: paypalCustomerEmail, stockReserved: true, createdAt: now, aprobadoEn: now, notificacionPaypal: "pendiente" });
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      transaction.update(checkoutRef, { estado: "capturada", orderId, capturedAt: now });
      return { orderId, created: true };
    });
    if (result.created) {
      after(async () => {
        try {
          const { notificarCompraPaypal } = await import("../../../lib/transferencia-email");
          await notificarCompraPaypal(result.orderId);
        } catch (emailError) {
          console.error("[paypal/capturar-orden] Pago aprobado, pero falló el correo:", emailError);
          await db.collection("ordenes").where("orderId", "==", result.orderId).limit(1).get().then(async (snapshot) => {
            if (!snapshot.empty) await snapshot.docs[0].ref.update({ notificacionPaypal: "fallida" });
          });
        }
      });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[paypal/capturar-orden]", error);
    return NextResponse.json({ error: error.message || "No se pudo confirmar el pago de PayPal." }, { status: 400 });
  }
}
