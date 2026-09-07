"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { getIdToken } from "firebase/auth";
import type { CuentaBancaria } from "../../lib/transferencias-db";

const emptyForm = { banco: "", tipoCuenta: "Cuenta corriente", numeroCuenta: "", titular: "", identificacion: "", correo: "" };

export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/transferencias/cuentas");
    setCuentas(await response.json());
  };
  useEffect(() => {
    let active = true;
    fetch("/api/transferencias/cuentas")
      .then((response) => response.json())
      .then((data) => { if (active) setCuentas(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setMessage("No se pudieron cargar las cuentas."); });
    return () => { active = false; };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return setMessage("Inicia sesión como administrador.");
    const token = await getIdToken(currentUser);
    const response = await fetch("/api/transferencias/cuentas", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(editingId ? { ...form, id: editingId } : form) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo guardar la cuenta.");
    setForm(emptyForm); setEditingId(null); setMessage("Cuenta guardada."); await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cuenta?")) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const token = await getIdToken(currentUser);
    await fetch("/api/transferencias/cuentas", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    await load();
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl space-y-6"><header><p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Transferencias</p><h1 className="mt-1 text-3xl font-bold">Cuentas bancarias</h1><p className="mt-2 text-sm text-slate-500">Estas cuentas aparecerán en el modal de pago del carrito.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">{editingId ? "Editar cuenta" : "Agregar cuenta"}</h2><form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">{([['banco','Banco'],['tipoCuenta','Tipo de cuenta'],['numeroCuenta','Número de cuenta'],['titular','Titular'],['identificacion','Identificación'],['correo','Correo de la cuenta']] as const).map(([key,label]) => <label key={key} className="text-sm font-semibold">{label}<input required={['banco','tipoCuenta','numeroCuenta','titular'].includes(key)} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>)}<div className="flex gap-2 sm:col-span-2"><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">{editingId ? "Guardar cambios" : "Agregar cuenta"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold">Cancelar</button>}</div></form>{message && <p className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{message}</p>}</section><section className="space-y-3">{cuentas.map((cuenta) => <article key={cuenta.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">{cuenta.banco}</h3><p className="text-sm text-slate-600">{cuenta.tipoCuenta} · {cuenta.numeroCuenta}</p><p className="text-sm text-slate-500">{cuenta.titular}</p></div><div className="flex gap-3"><button onClick={() => { setEditingId(cuenta.id); setForm({ banco: cuenta.banco, tipoCuenta: cuenta.tipoCuenta, numeroCuenta: cuenta.numeroCuenta, titular: cuenta.titular, identificacion: cuenta.identificacion || "", correo: cuenta.correo || "" }); }} className="text-sm font-semibold">Editar</button><button onClick={() => remove(cuenta.id)} className="text-sm font-semibold text-red-600">Eliminar</button></div></article>)}</section></div></main>;
}
