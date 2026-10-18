/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from "resend";
import admin from "./firebase-admin";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] || character);

function buildEmail(order: any) {
  const products = (order.productos || []).map((item: any) => {
    const productImage = item.imagen || item.imagenes?.[0] || "";
    const imageHtml = productImage ? `<img src="${escapeHtml(productImage)}" alt="${escapeHtml(item.nombre)}" style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;margin-right:12px" />` : "";
    return `<li style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #e5e7eb">${imageHtml}<div style="flex:1"><p style="margin:0;font-weight:600;color:#1f2937">${escapeHtml(item.nombre)}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">Cantidad: ${item.cantidad} · Precio unitario: $${Number(item.precioUnitario || item.precio || 0).toFixed(2)}</p></div><p style="margin:0;font-weight:700;color:#1f2937">$${Number(item.subtotal || 0).toFixed(2)}</p></li>`;
  }).join("");

  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;background:#fff">
    <div style="background:linear-gradient(135deg,#f472b6 0%,#ec4899 100%);color:#fff;padding:32px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:24px;font-weight:700">🌸 Nueva transferencia pendiente</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:0.9">El cliente envió una evidencia de pago. Revísala antes de aprobar la orden.</p>
    </div>

    <div style="padding:24px">
      <div style="background:#fdf2f8;padding:20px;border-radius:12px;border:1px solid #fbcfe8;margin-bottom:24px">
        <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#be185d">📋 Información del pedido</h2>
        <p style="margin:8px 0"><b>Orden:</b> ${escapeHtml(order.orderId)}</p>
        <p style="margin:8px 0"><b>Cliente:</b> ${escapeHtml(order.customerName)}</p>
        <p style="margin:8px 0"><b>Cédula/RUC:</b> ${escapeHtml(order.customerCedula || "No proporcionado")}</p>
        <p style="margin:8px 0"><b>Teléfono:</b> ${escapeHtml(order.customerPhone)}</p>
        <p style="margin:8px 0"><b>Correo:</b> ${escapeHtml(order.customerEmail)}</p>
        <p style="margin:8px 0"><b>Dirección:</b> ${escapeHtml(order.customerAddress || "No proporcionado")}</p>
        <p style="margin:8px 0"><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p>
        <p style="margin:8px 0"><b>Cuenta:</b> ${escapeHtml(order.cuentaBancaria?.banco)} / ${escapeHtml(order.cuentaBancaria?.tipoCuenta)} / ${escapeHtml(order.cuentaBancaria?.numeroCuenta)}</p>
        <p style="margin:8px 0"><b>Titular:</b> ${escapeHtml(order.cuentaBancaria?.titular)}</p>
        <p style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#be185d">Total: $${Number(order.total || 0).toFixed(2)}</p>
      </div>

      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937">🛍️ Productos</h2>
      <ul style="list-style:none;padding:0;margin:0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${products}</ul>

      <div style="margin-top:24px;text-align:center">
        <a href="${escapeHtml(order.evidenceUrl)}" style="display:inline-block;background:#ec4899;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600">📎 Ver evidencia de pago</a>
      </div>
    </div>

    <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#6b7280">Este correo fue generado automáticamente por Julietas Flowers</p>
    </div>
  </div>`;
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

export async function notificarClienteTransferenciaCreada(orderId: string): Promise<void> {
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

  const products = (order.productos || []).map((item: any) => {
    const productImage = item.imagen || item.imagenes?.[0] || "";
    const imageHtml = productImage ? `<img src="${escapeHtml(productImage)}" alt="${escapeHtml(item.nombre)}" style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;margin-right:12px" />` : "";
    return `<li style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #e5e7eb">${imageHtml}<div style="flex:1"><p style="margin:0;font-weight:600;color:#1f2937">${escapeHtml(item.nombre)}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">Cantidad: ${item.cantidad} · Precio unitario: $${Number(item.precioUnitario || item.precio || 0).toFixed(2)}</p></div><p style="margin:0;font-weight:700;color:#1f2937">$${Number(item.subtotal || 0).toFixed(2)}</p></li>`;
  }).join("");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = {
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    subject: `🌸 Hemos recibido tu pedido ${order.orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;background:#fff">
      <div style="background:linear-gradient(135deg,#f472b6 0%,#ec4899 100%);color:#fff;padding:32px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:24px;font-weight:700">¡Gracias por tu pedido!</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9">Hemos recibido tu evidencia de pago. Estamos revisando la transferencia.</p>
      </div>

      <div style="padding:24px">
        <div style="background:#fdf2f8;padding:20px;border-radius:12px;border:1px solid #fbcfe8;margin-bottom:24px">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#be185d">📋 Información del pedido</h2>
          <p style="margin:8px 0"><b>Orden:</b> ${escapeHtml(order.orderId)}</p>
          <p style="margin:8px 0"><b>Nombre:</b> ${escapeHtml(order.customerName)}</p>
          <p style="margin:8px 0"><b>Cédula/RUC:</b> ${escapeHtml(order.customerCedula || "No proporcionado")}</p>
          <p style="margin:8px 0"><b>Teléfono:</b> ${escapeHtml(order.customerPhone)}</p>
          <p style="margin:8px 0"><b>Correo:</b> ${escapeHtml(order.customerEmail)}</p>
          <p style="margin:8px 0"><b>Dirección:</b> ${escapeHtml(order.customerAddress || "No proporcionado")}</p>
          <p style="margin:8px 0"><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p>
          <p style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#be185d">Total: $${Number(order.total || 0).toFixed(2)}</p>
        </div>

        <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937">🛍️ Productos</h2>
        <ul style="list-style:none;padding:0;margin:0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${products}</ul>

        <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d">
          <p style="margin:0;color:#92400e;font-size:14px">⏳ Tu pedido está siendo revisado. Te notificaremos por WhatsApp o correo cuando sea aprobado.</p>
        </div>
      </div>

      <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#6b7280">Este correo fue generado automáticamente por Julietas Flowers</p>
      </div>
    </div>`,
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

export async function notificarCompraAprobada(orderId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado.");

  const db = admin.firestore();
  const orderRef = db.collection("ordenes").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Orden no encontrada");
  const order = { id: orderId, ...orderSnap.data() } as any;
  const customerEmail = order.customerEmail || order.email;
  const ownerEmail = process.env.TRANSFER_OWNER_EMAIL || process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL;
  const testEmail = process.env.RESEND_TEST_EMAIL;
  const testMode = process.env.RESEND_TEST_MODE === "true";
  if (!customerEmail && !testEmail) throw new Error("La orden no tiene correo del cliente.");

  const products = (order.productos || []).map((item: any) => {
    const productImage = item.imagen || item.imagenes?.[0] || "";
    const imageHtml = productImage ? `<img src="${escapeHtml(productImage)}" alt="${escapeHtml(item.nombre)}" style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;margin-right:12px" />` : "";
    return `<li style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #e5e7eb">${imageHtml}<div style="flex:1"><p style="margin:0;font-weight:600;color:#1f2937">${escapeHtml(item.nombre)}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">Cantidad: ${item.cantidad} · Precio unitario: $${Number(item.precioUnitario || item.precio || 0).toFixed(2)}</p></div><p style="margin:0;font-weight:700;color:#1f2937">$${Number(item.subtotal || 0).toFixed(2)}</p></li>`;
  }).join("");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  // Enviar correo al cliente
  const customerEmailTemplate = {
    from,
    subject: `🎉 ¡Tu compra fue aprobada! ${order.orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;background:#fff">
      <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;padding:32px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:24px;font-weight:700">¡Tu compra fue aprobada! 🎉</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9">Confirmamos tu transferencia. Tu pedido será preparado para entrega.</p>
      </div>

      <div style="padding:24px">
        <div style="background:#ecfdf5;padding:20px;border-radius:12px;border:1px solid #a7f3d0;margin-bottom:24px">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#047857">📋 Información del pedido</h2>
          <p style="margin:8px 0"><b>Orden:</b> ${escapeHtml(order.orderId)}</p>
          <p style="margin:8px 0"><b>Nombre:</b> ${escapeHtml(order.customerName)}</p>
          <p style="margin:8px 0"><b>Dirección:</b> ${escapeHtml(order.customerAddress || "No proporcionado")}</p>
          <p style="margin:8px 0"><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p>
          <p style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#047857">Total: $${Number(order.total || 0).toFixed(2)}</p>
        </div>

        <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937">🛍️ Productos</h2>
        <ul style="list-style:none;padding:0;margin:0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${products}</ul>

        <div style="margin-top:24px;padding:16px;background:#dbeafe;border-radius:8px;border:1px solid #93c5fd">
          <p style="margin:0;color:#1e40af;font-size:14px">📦 Tu pedido está siendo preparado. Te contactaremos para coordinar la entrega.</p>
        </div>
      </div>

      <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#6b7280">Gracias por comprar en Julietas Flowers</p>
      </div>
    </div>`,
    replyTo: customerEmail || testEmail,
  };

  const firstDestination = customerEmail || testEmail;
  const firstResult = await resend.emails.send({ ...customerEmailTemplate, to: firstDestination });
  if (!firstResult.error) {
    await orderRef.update({ notificacionCliente: "enviada", notificacionClienteEn: admin.firestore.Timestamp.now() });
  } else if (testMode && testEmail && testEmail !== customerEmail) {
    const fallbackResult = await resend.emails.send({ ...customerEmailTemplate, to: testEmail });
    if (!fallbackResult.error) {
      await orderRef.update({ notificacionCliente: "enviada_fallback_prueba", notificacionClienteEn: admin.firestore.Timestamp.now() });
    }
  }

  // Enviar correo al dueño
  if (ownerEmail) {
    const ownerEmailTemplate = {
      from,
      subject: `✅ Orden aprobada ${order.orderId}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;background:#fff">
        <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:24px;font-weight:700">✅ Orden aprobada</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.9">La transferencia fue verificada y el pedido aprobado.</p>
        </div>

        <div style="padding:24px">
          <div style="background:#ecfdf5;padding:20px;border-radius:12px;border:1px solid #a7f3d0;margin-bottom:24px">
            <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#047857">📋 Información del pedido</h2>
            <p style="margin:8px 0"><b>Orden:</b> ${escapeHtml(order.orderId)}</p>
            <p style="margin:8px 0"><b>Cliente:</b> ${escapeHtml(order.customerName)}</p>
            <p style="margin:8px 0"><b>Cédula/RUC:</b> ${escapeHtml(order.customerCedula || "No proporcionado")}</p>
            <p style="margin:8px 0"><b>Teléfono:</b> ${escapeHtml(order.customerPhone)}</p>
            <p style="margin:8px 0"><b>Correo:</b> ${escapeHtml(order.customerEmail)}</p>
            <p style="margin:8px 0"><b>Dirección:</b> ${escapeHtml(order.customerAddress || "No proporcionado")}</p>
            <p style="margin:8px 0"><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p>
            <p style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#047857">Total: $${Number(order.total || 0).toFixed(2)}</p>
          </div>

          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937">🛍️ Productos</h2>
          <ul style="list-style:none;padding:0;margin:0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${products}</ul>
        </div>

        <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#6b7280">Este correo fue generado automáticamente por Julietas Flowers</p>
        </div>
      </div>`,
      replyTo: customerEmail || ownerEmail,
    };

    await resend.emails.send({ ...ownerEmailTemplate, to: ownerEmail });
  }
}

export async function notificarCompraPaypal(orderId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado.");
  const ownerEmail = process.env.TRANSFER_OWNER_EMAIL || process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL;
  if (!ownerEmail) throw new Error("No hay correo del dueño configurado.");

  const db = admin.firestore();
  const orderRef = db.collection("ordenes").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists) throw new Error("Orden no encontrada");
  const order = { id: orderId, ...snapshot.data() } as any;
  const customerEmail = order.customerEmail || order.email;
  const testEmail = process.env.RESEND_TEST_EMAIL;
  const products = (order.productos || []).map((item: any) => `<li>${escapeHtml(item.nombre)} x${item.cantidad} - $${Number(item.subtotal || 0).toFixed(2)}</li>`).join("");
  const details = `<p><b>Orden:</b> ${escapeHtml(order.orderId)}</p><p><b>Total:</b> $${Number(order.total || 0).toFixed(2)}</p><p><b>Entrega:</b> ${escapeHtml(order.ciudadEntrega)} - ${escapeHtml(order.zonaEntrega)}</p><h2>Productos</h2><ul>${products}</ul>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const errors: string[] = [];
  const ownerResult = await resend.emails.send({
    from,
    to: ownerEmail,
    subject: `Nueva compra con PayPal ${order.orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h1>Compra confirmada por PayPal</h1><p>Un cliente completó el pago con PayPal.</p><p><b>Correo PayPal:</b> ${escapeHtml(customerEmail || "No disponible")}</p>${details}</div>`,
    replyTo: customerEmail || ownerEmail,
  });
  if (ownerResult.error) errors.push(`dueño: ${ownerResult.error.message}`);

  if (customerEmail) {
    const customerMessage = {
      from,
      subject: `Compra confirmada ${order.orderId}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h1>¡Gracias por tu compra!</h1><p>PayPal confirmó tu pago. Tu pedido fue registrado correctamente y será preparado para entrega.</p>${details}<p>Conserva este número de orden: <b>${escapeHtml(order.orderId)}</b>.</p></div>`,
      replyTo: ownerEmail,
    };
    const customerResult = await resend.emails.send({ ...customerMessage, to: customerEmail });
    if (customerResult.error && process.env.RESEND_TEST_MODE === "true" && testEmail && testEmail !== customerEmail) {
      const fallbackResult = await resend.emails.send({ ...customerMessage, to: testEmail });
      if (fallbackResult.error) errors.push(`cliente: ${customerResult.error.message}`);
      else await orderRef.update({ notificacionClientePaypal: "enviada_fallback_prueba" });
    } else if (customerResult.error) {
      errors.push(`cliente: ${customerResult.error.message}`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join(" | "));
  await orderRef.update({ notificacionPaypal: "enviada", notificacionPaypalEn: admin.firestore.Timestamp.now() });
}
