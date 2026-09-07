/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { notificarTransferencia } from "../../../lib/transferencia-email";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await notificarTransferencia(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[transferencias/notificar]", error);
    return NextResponse.json({ success: false, error: error.message || "No se pudo enviar el correo" }, { status: 200 });
  }
}
