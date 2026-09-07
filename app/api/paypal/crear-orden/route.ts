/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";
import { buildOrderProductLine } from "../../../lib/order-checkout-utils";
import { paypalRequest } from "../../../lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productos, deliveryCost = 0, ciudadEntrega, zonaEntrega } = body;
    if (!Array.isArray(productos) || productos.length === 0 || !ciudadEntrega || !zonaEntrega) {
      return NextResponse.json({ error: "Productos y ubicación de entrega son requeridos." }, { status: 400 });
    }

    const db = admin.firestore();
    const snapshots = await db.getAll(...productos.map((item: any) => db.collection("productos").doc(item.id)));
    const productsById = new Map(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, snapshot.data()]));
    const processedProducts = productos.map((item: any) => {
      const product = productsById.get(item.id);
      if (!product) throw new Error(`Producto no encontrado: ${item.id}`);
      return buildOrderProductLine(item, { ...product, id: item.id });
    });
    const subtotal = processedProducts.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
    const shipping = Math.max(0, Number(deliveryCost || 0));
    const total = Math.round((subtotal + shipping) * 100) / 100;
    const paypalOrder = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": `julietas-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: total.toFixed(2) },
          description: `Compra ${processedProducts.map((item: any) => item.nombre).join(", ").slice(0, 120)}`,
        }],
        application_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    });

    await db.collection("paypal_checkouts").doc(paypalOrder.id).set({
      paypalOrderId: paypalOrder.id,
      productos: processedProducts,
      subtotal,
      costoEntrega: shipping,
      total,
      ciudadEntrega,
      zonaEntrega,
      customerEmail: body.customerEmail || null,
      createdAt: admin.firestore.Timestamp.now(),
      estado: "creada",
    });
    return NextResponse.json({ id: paypalOrder.id });
  } catch (error: any) {
    console.error("[paypal/crear-orden]", error);
    return NextResponse.json({ error: error.message || "No se pudo crear la orden de PayPal." }, { status: 400 });
  }
}
