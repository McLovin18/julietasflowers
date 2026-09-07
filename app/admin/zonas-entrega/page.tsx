"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CONFIGURACION_ENTREGA_DEFAULT,
  ConfiguracionEntrega,
  eliminarTarifaEntrega,
  guardarConfiguracionEntrega,
  guardarTarifaEntrega,
  obtenerConfiguracionEntrega,
  obtenerTarifasEntrega,
  TarifaEntrega,
} from "../../lib/entregas-db";

const emptyForm = { tipo: "ciudad" as "ciudad" | "zona", ciudad: "", nombre: "", precio: "" };

export default function ZonasEntregaPage() {
  const [configuracion, setConfiguracion] = useState<ConfiguracionEntrega>(CONFIGURACION_ENTREGA_DEFAULT);
  const [tarifas, setTarifas] = useState<TarifaEntrega[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const ciudades = useMemo(
    () => [...new Set(tarifas.map((tarifa) => tarifa.ciudad))].sort((a, b) => a.localeCompare(b)),
    [tarifas]
  );

  const tarifasPorCiudad = useMemo(
    () => ciudades.map((ciudad) => ({
      ciudad,
      tarifaCiudad: tarifas.find((tarifa) => tarifa.tipo === "ciudad" && tarifa.ciudad === ciudad),
      zonas: tarifas
        .filter((tarifa) => tarifa.tipo === "zona" && tarifa.ciudad === ciudad)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    })),
    [ciudades, tarifas]
  );

  useEffect(() => {
    Promise.all([obtenerConfiguracionEntrega(), obtenerTarifasEntrega()])
      .then(([config, tarifasCargadas]) => {
        setConfiguracion(config);
        setTarifas(tarifasCargadas);
      })
      .catch(() => setMessage("No se pudo cargar la configuración de entregas."))
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setMessage("");
    try {
      await guardarConfiguracionEntrega(configuracion);
      setMessage("Monto mínimo actualizado.");
    } catch {
      setMessage("No se pudo guardar el monto mínimo.");
    } finally {
      setSaving(false);
    }
  };

  const saveTarifa = async (event: React.FormEvent) => {
    event.preventDefault();
    const ciudad = form.ciudad.trim();
    const nombre = form.nombre.trim();
    const precio = form.precio.trim() === "" ? undefined : Number(form.precio);
    if (!ciudad || !nombre || (form.tipo === "ciudad" && (precio === undefined || !Number.isFinite(precio) || precio < 0)) || (precio !== undefined && (!Number.isFinite(precio) || precio < 0))) {
      setMessage(form.tipo === "zona" ? "Completa ciudad y zona. El precio de una zona es opcional." : "Completa ciudad, nombre y un precio válido.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const tarifa = {
        tipo: form.tipo,
        ciudad,
        nombre,
        ...(precio === undefined ? {} : { precio }),
      };
      await guardarTarifaEntrega(tarifa, editingId || undefined);
      setTarifas(await obtenerTarifasEntrega());
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? "Tarifa actualizada." : "Tarifa agregada.");
    } catch {
      setMessage("No se pudo guardar la tarifa.");
    } finally {
      setSaving(false);
    }
  };

  const editTarifa = (tarifa: TarifaEntrega) => {
    setEditingId(tarifa.id);
    setForm({ tipo: tarifa.tipo, ciudad: tarifa.ciudad, nombre: tarifa.nombre, precio: tarifa.precio === undefined || tarifa.precio === null ? "" : String(tarifa.precio) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeTarifa = async (tarifa: TarifaEntrega) => {
    if (!window.confirm(`¿Eliminar la tarifa de ${tarifa.nombre}?`)) return;
    await eliminarTarifaEntrega(tarifa.id);
    setTarifas((current) => current.filter((item) => item.id !== tarifa.id));
    if (editingId === tarifa.id) {
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Operación</p>
          <h1 className="mt-1 text-3xl font-bold">Zonas de entrega</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Define cuándo el envío es gratis y administra tarifas para cualquier ciudad o zona de Ecuador.</p>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold text-amber-900">Envío gratis desde</p>
              <p className="mt-1 text-sm text-amber-800">Las compras que alcancen este monto no suman el costo de su ciudad o zona.</p>
            </div>
            <div className="flex items-end gap-3">
              <label className="text-sm font-semibold text-amber-900">
                Monto mínimo
                <div className="mt-1 flex items-center rounded-xl border border-amber-300 bg-white px-3">
                  <span className="text-amber-700">$</span>
                  <input type="number" min="0" step="0.01" value={configuracion.montoMinimoEntregaGratis} onChange={(event) => setConfiguracion({ montoMinimoEntregaGratis: Number(event.target.value) })} className="w-28 border-0 bg-transparent px-2 py-2 font-bold outline-none" />
                </div>
              </label>
              <button onClick={saveConfig} disabled={saving} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">{editingId ? "Editar tarifa" : "Agregar ciudad o zona"}</h2><p className="mt-1 text-sm text-slate-500">Una zona con precio propio tiene prioridad; si dejas el precio vacío, usa el de su ciudad.</p></div>
            {editingId && <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Cancelar</button>}
          </div>
          <form onSubmit={saveTarifa} className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-semibold">Tipo<select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as "ciudad" | "zona", nombre: "" })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"><option value="ciudad">Ciudad</option><option value="zona">Zona específica</option></select></label>
            <label className="text-sm font-semibold">Ciudad<input list="ciudades" value={form.ciudad} onChange={(event) => setForm({ ...form, ciudad: event.target.value })} placeholder="Ej. Guayaquil" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /><datalist id="ciudades">{ciudades.map((ciudad) => <option key={ciudad} value={ciudad} />)}</datalist></label>
            <label className="text-sm font-semibold">{form.tipo === "ciudad" ? "Nombre visible" : "Zona"}<input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder={form.tipo === "ciudad" ? "Guayaquil" : "Ceibos Norte"} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-semibold">Precio de envío{form.tipo === "zona" && <span className="ml-1 font-normal text-slate-500">(opcional)</span>}<input type="number" min="0" step="0.01" value={form.precio} onChange={(event) => setForm({ ...form, precio: event.target.value })} placeholder={form.tipo === "zona" ? "Usar precio de ciudad" : "0.00"} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 md:col-span-4">{editingId ? "Guardar cambios" : "Agregar tarifa"}</button>
          </form>
        </section>

        {message && <p className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</p>}
        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Ciudades y zonas</h2><p className="mt-1 text-sm text-slate-500">Cada zona aparece dentro de la ciudad a la que pertenece.</p></div><span className="text-sm text-slate-500">{loading ? "Cargando..." : `${ciudades.length} ciudades · ${tarifas.filter((tarifa) => tarifa.tipo === "zona").length} zonas`}</span></div>
          {tarifas.length === 0 && !loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Aún no hay ciudades ni zonas configuradas.</div> : <div className="space-y-4">{tarifasPorCiudad.map(({ ciudad, tarifaCiudad, zonas }) => <article key={ciudad} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700">⌖</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{ciudad}</h3><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Ciudad</span></div><p className="mt-1 text-sm text-slate-500">Tarifa base para zonas sin precio propio</p></div></div>
              <div className="flex items-center gap-3 sm:text-right"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Envío base</p><strong className="text-xl text-slate-900">{tarifaCiudad?.precio === undefined || tarifaCiudad?.precio === null ? "Sin configurar" : `$${Number(tarifaCiudad.precio).toFixed(2)}`}</strong></div>{tarifaCiudad && <div className="flex gap-2"><button onClick={() => editTarifa(tarifaCiudad)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Editar</button><button onClick={() => removeTarifa(tarifaCiudad)} className="text-sm font-semibold text-red-600 hover:text-red-800">Eliminar</button></div>}</div>
            </div>
            <div className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-700">Zonas de {ciudad}</h4><span className="text-xs font-semibold text-slate-400">{zonas.length} {zonas.length === 1 ? "zona" : "zonas"}</span></div>{zonas.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">Toda la ciudad usa la tarifa base.</p> : <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{zonas.map((tarifa) => <div key={tarifa.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sm text-sky-700">⌂</span><div><p className="font-semibold text-slate-800">{tarifa.nombre}</p><p className="text-xs text-slate-500">{tarifa.precio === undefined || tarifa.precio === null ? "Usa el precio de la ciudad" : "Precio específico para esta zona"}</p></div></div><div className="flex items-center gap-3"><strong className="text-sm text-slate-900">{tarifa.precio === undefined || tarifa.precio === null ? "Heredado" : `$${Number(tarifa.precio).toFixed(2)}`}</strong><button onClick={() => editTarifa(tarifa)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Editar</button><button onClick={() => removeTarifa(tarifa)} className="text-sm font-semibold text-red-600 hover:text-red-800">Eliminar</button></div></div>)}</div>}</div>
          </article>)}</div>}
        </section>
      </div>
    </main>
  );
}