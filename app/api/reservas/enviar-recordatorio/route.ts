import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { reservaId, email } = await req.json();

    // In a real implementation, you would fetch the reservation details from the database
    // and include the event name and date in the email
    
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
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌸 Julieta's Flowers</h1>
      <p>Recordatorio de tu reserva</p>
    </div>
    
    <div class="content">
      <div class="reminder-box">
        <p class="label">Recordatorio</p>
        <p class="text">No olvides tu fecha especial reservada</p>
      </div>

      <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
        Hola,
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
        Este es un recordatorio sobre tu reserva en Julieta's Flowers. Tu fecha especial está próxima.
      </p>

      <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
        Visita nuestra tienda para seleccionar las flores perfectas para tu ocasión especial.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://julietasflowers.com/productos" style="display: inline-block; padding: 12px 24px; background: #000000; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Ver Productos
        </a>
      </div>
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
      to: email,
      subject: "Recordatorio de tu reserva - Julieta's Flowers",
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "Error al enviar el recordatorio" },
      { status: 500 }
    );
  }
}
