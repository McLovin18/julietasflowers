/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from "resend";
import admin from "./firebase-admin";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] || character);

function buildEmail(order: any) {
  const products = (order.productos || []).map((item: any) => `<li>${escapeHtml(item.nombre)} x${item.cantidad} - $${Number(item.subtotal || 0).toFixed(2)}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937"><h1 style="background:#111827;color:#fff;padding:24px">Nueva transferencia pendiente</h1><p>El cliente envió una evidencia de pago. Revísala antes de aprobar la orden.</p><div style="background:#f3f4f6;padding:16px;border-radius:8px"><p><b>Orden:</b> ${escapeHtml(order.orderId)}</p><p><b>Cliente:</b> ${escapeHtml(order.customerName)}</p><p><b>Teléfono:</b> ${escapeHtml(order.customerPhone)}</p><p><b>Correo:</b> ${escapeHtml(order.customerEmail)}</p><p><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p><p><b>Cuenta:</b> ${escapeHtml(order.cuentaBancaria?.banco)} / ${escapeHtml(order.cuentaBancaria?.numeroCuenta)}</p><p><b>Total:</b> $${Number(order.total || 0).toFixed(2)}</p></div><h2>Productos</h2><ul>${products}</ul><p><a href="${escapeHtml(order.evidenceUrl)}">Abrir evidencia de pago</a></p></div>`;
}

export async function notificarTransferencia(orderId: string): Promise<void> {
  const ownerEmail = process.env.TRANSFER_OWNER_EMAIL || process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL;
  if (!ownerEmail || !process.env.RESEND_API_KEY) {
    throw new Error("Faltan RESEND_API_KEY y/o TRANSFER_OWNER_EMAIL para enviar la notificación.");
  }
  const db = admin.firestore();
  const orderRef = db.collection("ordenes").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Orden no encontrada");
  const order = { id: orderId, ...orderSnap.data() } as any;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: ownerEmail,
    subject: `Transferencia pendiente ${order.orderId}`,
    html: buildEmail(order),
    attachments: [{ path: order.evidenceUrl, filename: `evidencia-${order.orderId}` }],
    replyTo: order.customerEmail,
  });
  if (result.error) throw new Error(result.error.message);
  await orderRef.update({ notificacionCorreo: "enviada", notificacionCorreoEn: admin.firestore.Timestamp.now() });
}

export async function notificarCompraAprobada(orderId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado.");

  const db = admin.firestore();
  const orderRef = db.collection("ordenes").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Orden no encontrada");
  const order = { id: orderId, ...orderSnap.data() } as any;
  const customerEmail = order.customerEmail || order.email;
  const testEmail = process.env.RESEND_TEST_EMAIL;
  const testMode = process.env.RESEND_TEST_MODE === "true";
  if (!customerEmail && !testEmail) throw new Error("La orden no tiene correo del cliente.");

  const products = (order.productos || []).map((item: any) => `<li>${escapeHtml(item.nombre)} x${item.cantidad} - $${Number(item.subtotal || 0).toFixed(2)}</li>`).join("");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = {
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    subject: `Compra aprobada ${order.orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937"><h1 style="background:#111827;color:#fff;padding:24px">¡Tu compra fue aprobada!</h1><p>Confirmamos tu transferencia y tu pedido será preparado para entregarte.</p><div style="background:#f3f4f6;padding:16px;border-radius:8px"><p><b>Orden:</b> ${escapeHtml(order.orderId)}</p><p><b>Total:</b> $${Number(order.total || 0).toFixed(2)}</p><p><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p></div><h2>Productos</h2><ul>${products}</ul><p>Gracias por tu compra.</p></div>`,
    replyTo: customerEmail || testEmail,
  };

  const firstDestination = customerEmail || testEmail;
  const firstResult = await resend.emails.send({ ...email, to: firstDestination });
  if (!firstResult.error) {
    await orderRef.update({ notificacionCliente: "enviada", notificacionClienteEn: admin.firestore.Timestamp.now() });
    return;
  }

  if (testMode && testEmail && testEmail !== customerEmail) {
    const fallbackResult = await resend.emails.send({ ...email, to: testEmail });
    if (!fallbackResult.error) {
      await orderRef.update({ notificacionCliente: "enviada_fallback_prueba", notificacionClienteEn: admin.firestore.Timestamp.now() });
      return;
    }
  }

  throw new Error(firstResult.error.message);
}
