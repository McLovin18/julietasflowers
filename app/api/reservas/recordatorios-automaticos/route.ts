import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { obtenerReservasParaRecordatorio, marcarRecordatorioEnviado } from "../../../lib/reservas-db";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  try {
    // Get reservations that need automatic reminders (2 days before event)
    const reservas = await obtenerReservasParaRecordatorio();
    
    if (reservas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No reservations need reminders at this time" 
      });
    }

    let remindersSent = 0;
    let errors = 0;

    for (const reserva of reservas) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #000000; color: white; padding: 32px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px; }
    .reminder-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .reminder-box .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; margin: 0; }
    .reminder-box .text { font-size: 16px; font-weight: bold; color: #92400e; margin: 8px 0 0; }
    .event-info { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .event-info p { margin: 4px 0; color: #1e40af; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌸 Julieta's Flowers</h1>
      <p>Recordatorio automático - Tu evento está próximo</p>
    </div>
    
    <div class="content">
      <div class="reminder-box">
        <p class="label">Recordatorio Automático</p>
        <p class="text">Faltan 2 días para tu evento especial</p>
      </div>

      <div class="event-info">
        <p style="font-weight: bold; margin-bottom: 8px;">Detalles del evento:</p>
        <p><strong>Evento:</strong> ${reserva.nombreEventoPersonalizado || "Evento especial"}</p>
        <p><strong>Fecha:</strong> ${new Date(reserva.fechaEvento).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        })}</p>
      </div>

      <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
        Hola ${reserva.nombreCliente},
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
        Este es un recordatorio automático de Julieta's Flowers. Tu evento especial está a solo 2 días. 
        Asegúrate de visitar nuestra tienda para seleccionar las flores perfectas para esta ocasión.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://julietasflowers.com/productos" style="display: inline-block; padding: 12px 24px; background: #000000; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Ver Productos
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
        Si ya has realizado tu reserva, no necesitas hacer nada adicional. Nos encargaremos de que todo esté listo para tu fecha especial.
      </p>
    </div>

    <div class="footer">
      <p>Este correo fue enviado automáticamente por Julieta's Flowers</p>
      <p style="margin-top: 8px;">© ${new Date().getFullYear()} Julieta's Flowers. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
        `;

        await resend.emails.send({
          from: "Julieta's Flowers <noreply@julietasflowers.com>",
          to: reserva.email,
          subject: `Recordatorio: Tu evento está en 2 días - Julieta's Flowers`,
          html: emailHtml,
        });

        // Mark reminder as sent
        await marcarRecordatorioEnviado(reserva.id, true);
        remindersSent++;
      } catch (error) {
        console.error(`Error sending reminder to ${reserva.email}:`, error);
        errors++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      remindersSent,
      errors,
      totalProcessed: reservas.length
    });
  } catch (error) {
    console.error("Error in automatic reminders job:", error);
    return NextResponse.json(
      { error: "Error processing automatic reminders" },
      { status: 500 }
    );
  }
}
