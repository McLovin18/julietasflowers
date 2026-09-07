/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await admin.firestore().collection("cuentas_bancarias").get();
    const cuentas = snapshot.docs.filter((item) => item.data().activa !== false).map((item) => ({ id: item.id, ...item.data() }));
    return NextResponse.json(cuentas);
  } catch (error: any) {
    console.error("[transferencias/cuentas]", error);
    return NextResponse.json({ error: "No se pudieron cargar las cuentas bancarias." }, { status: 500 });
  }
}

async function isAdmin(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  try { return (await admin.auth().verifyIdToken(header.slice(7))).admin === true; } catch { return false; }
}

export async function POST(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json();
  if (!body.banco || !body.tipoCuenta || !body.numeroCuenta || !body.titular) return NextResponse.json({ error: "Completa los datos de la cuenta." }, { status: 400 });
  const ref = await admin.firestore().collection("cuentas_bancarias").add({ ...body, activa: true, createdAt: admin.firestore.Timestamp.now() });
  return NextResponse.json({ id: ref.id });
}

export async function PUT(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await admin.firestore().collection("cuentas_bancarias").doc(id).update(data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await admin.firestore().collection("cuentas_bancarias").doc(id).update({ activa: false });
  return NextResponse.json({ success: true });
}
