"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerEventosActivos, EventoEspecial } from "../lib/eventos-especiales-db";
import { crearReserva, marcarRecordatorioEnviado } from "../lib/reservas-db";

const serif = { fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif" };

const inputClass =
  "w-full px-4 py-3 bg-white border border-[#E9D5D0] rounded-sm text-[#2B2B28] placeholder:text-[#2B2B28]/35 focus:outline-none focus:border-[#4A5D4F] focus:ring-1 focus:ring-[#4A5D4F]/40 transition-colors disabled:bg-[#FAF7F2] disabled:text-[#2B2B28]/60 disabled:cursor-not-allowed";

const labelClass = "block text-[11px] uppercase tracking-[0.25em] text-[#4A5D4F] mb-2";

function Ornamento() {
  return (
    <div className="flex items-center justify-center gap-4 text-[#B76E79]">
      <span className="h-px w-16 bg-[#B76E79]/40" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 9.8C12 6 10.5 3.5 12 2c1.5 1.5 0 4 0 7.8Z" />
        <path d="M12 14.2c0 3.8 1.5 6.3 0 7.8-1.5-1.5 0-4 0-7.8Z" />
        <path d="M9.8 12C6 12 3.5 10.5 2 12c1.5 1.5 4 0 7.8 0Z" />
        <path d="M14.2 12c3.8 0 6.3-1.5 7.8 0-1.5 1.5-4 0-7.8 0Z" />
      </svg>
      <span className="h-px w-16 bg-[#B76E79]/40" />
    </div>
  );
}

function TituloSeccion({ numero, titulo }: { numero: string; titulo: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <span className="text-2xl italic text-[#B76E79]" style={serif}>
        {numero}
      </span>
      <h2 className="text-2xl text-[#2B2B28]" style={{ ...serif, fontWeight: 500 }}>
        {titulo}
      </h2>
      <span className="flex-1 h-px bg-[#E9D5D0]" />
    </div>
  );
}

export default function ReservasPage() {
  const [eventos, setEventos] = useState<EventoEspecial[]>([]);
  const [loading, setLoading] = useState(true);

  // "" = sin elegir | "custom" = personalizado | id = evento especial
  const [selectedValue, setSelectedValue] = useState("");
  const [useEventDate, setUseEventDate] = useState(false);

  const [formData, setFormData] = useState({
    nombreCliente: "",
    email: "",
    nombreEventoPersonalizado: "",
    fechaEvento: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState(false);
  const [reservaActual, setReservaActual] = useState<any>(null);
  const [mensajeRecordatorio, setMensajeRecordatorio] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const selectedEvento = eventos.find((e) => e.id === selectedValue) ?? null;
  const isCustomEvent = selectedValue === "custom";

  useEffect(() => {
    loadEventos();
  }, []);

  async function loadEventos() {
    try {
      const data = await obtenerEventosActivos();
      setEventos(data);
    } catch (err) {
      console.error("Error loading eventos:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatearFecha(fecha: Date) {
    return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }

  function handleEventoChange(value: string) {
    setSelectedValue(value);
    setUseEventDate(false);
    setError(null);

    const evento = eventos.find((e) => e.id === value);
    if (evento) {
      setFormData((prev) => ({ ...prev, fechaEvento: evento.fecha.toISOString().split("T")[0] }));
    }
  }

  function handleUseEventDate(checked: boolean) {
    setUseEventDate(checked);
    if (checked && selectedEvento) {
      setFormData((prev) => ({ ...prev, fechaEvento: selectedEvento.fecha.toISOString().split("T")[0] }));
    }
  }

  async function handleEnviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.nombreCliente.trim() || !formData.email.trim()) {
      setError("Por favor completa tu nombre y correo electrónico.");
      return;
    }
    if (!selectedValue) {
      setError("Por favor selecciona un evento o elige la opción personalizada.");
      return;
    }
    if (isCustomEvent && !formData.nombreEventoPersonalizado.trim()) {
      setError("Por favor ingresa el nombre de tu evento personalizado.");
      return;
    }
    if (!formData.fechaEvento) {
      setError("Por favor selecciona una fecha para el evento.");
      return;
    }

    setEnviandoCodigo(true);

    try {
      const reserva = await crearReserva(
        formData.nombreCliente,
        formData.email,
        selectedEvento?.id,
        isCustomEvent ? formData.nombreEventoPersonalizado : undefined,
        useEventDate && selectedEvento ? selectedEvento.fecha : new Date(`${formData.fechaEvento}T12:00:00`)
      );

      setCodigoGenerado(reserva.codigo);
      setReservaActual(reserva);
    } catch (err) {
      console.error("Error creando reserva:", err);
      setError("No pudimos crear la reserva. Por favor intenta nuevamente.");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function handleEnviarRecordatorio() {
    if (!reservaActual) return;

    setEnviandoRecordatorio(true);
    setMensajeRecordatorio(null);

    try {
      await fetch("/api/reservas/enviar-recordatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservaId: reservaActual.id,
          email: reservaActual.email
        })
      });

      await marcarRecordatorioEnviado(reservaActual.id, false);
      setMensajeRecordatorio({ tipo: "ok", texto: "Recordatorio enviado a tu correo." });
    } catch (err) {
      console.error("Error enviando recordatorio:", err);
      setMensajeRecordatorio({ tipo: "error", texto: "No pudimos enviar el recordatorio. Intenta nuevamente." });
    } finally {
      setEnviandoRecordatorio(false);
    }
  }

  async function handleCopiarCodigo() {
    if (!codigoGenerado) return;
    try {
      await navigator.clipboard.writeText(codigoGenerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("No se pudo copiar el código:", err);
    }
  }

  function handleNuevaReserva() {
    setCodigoGenerado(null);
    setReservaActual(null);
    setFormData({ nombreCliente: "", email: "", nombreEventoPersonalizado: "", fechaEvento: "" });
    setSelectedValue("");
    setUseEventDate(false);
    setError(null);
    setMensajeRecordatorio(null);
  }

  const estilos = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-up { animation: fadeUp 0.7s ease both; }
    `}</style>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        {estilos}
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B76E79] mx-auto" />
          <p className="mt-5 text-[#4A5D4F]/70 italic text-lg" style={serif}>
            Preparando tus reservas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {estilos}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E9D5D0]/70">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#E9D5D0]/50 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#4A5D4F]/10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center fade-up">
          <p className="text-xs uppercase tracking-[0.4em] text-[#B76E79] mb-3">Recordatorios y reservas</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#2B2B28] leading-[1.05] mb-6" style={{ ...serif, fontWeight: 500 }}>
            Tus fechas especiales, <span className="italic text-[#B76E79]">siempre en flor</span>
          </h1>
          <Ornamento />
          <p className="mt-6 text-lg sm:text-xl text-[#4A5D4F]/90 max-w-xl mx-auto leading-relaxed" style={serif}>
            Guarda tu fecha y recibe un código para reservar tus flores con anticipación.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {!codigoGenerado ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12 items-start">
            {/* Formulario */}
            <form
              onSubmit={handleEnviarCodigo}
              noValidate
              className="lg:col-span-3 bg-white border border-[#E9D5D0] rounded-sm p-6 sm:p-10 fade-up"
            >
              {/* 01 Datos */}
              <TituloSeccion numero="01" titulo="Tus datos" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                <div>
                  <label htmlFor="nombreCliente" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="nombreCliente"
                    type="text"
                    value={formData.nombreCliente}
                    onChange={(e) => setFormData({ ...formData, nombreCliente: e.target.value })}
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 02 Evento */}
              <TituloSeccion numero="02" titulo="Tu evento" />
              <div className="space-y-5 mb-8">
                <div>
                  <label htmlFor="evento" className={labelClass}>
                    Evento
                  </label>
                  <div className="relative">
                    <select
                      id="evento"
                      value={selectedValue}
                      onChange={(e) => handleEventoChange(e.target.value)}
                      className={`${inputClass} appearance-none pr-12 cursor-pointer ${
                        selectedValue ? "" : "text-[#2B2B28]/40"
                      }`}
                    >
                      <option value="">Selecciona un evento</option>
                      {eventos.map((evento) => (
                        <option key={evento.id} value={evento.id} className="text-[#2B2B28]">
                          {evento.nombre} · {formatearFecha(evento.fecha)}
                        </option>
                      ))}
                      <option value="custom" className="text-[#2B2B28]">
                        Evento personalizado
                      </option>
                    </select>
                    <span className="material-icons-round pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#B76E79]">
                      expand_more
                    </span>
                  </div>
                </div>

                {isCustomEvent && (
                  <div className="fade-up">
                    <label htmlFor="eventoPersonalizado" className={labelClass}>
                      Nombre de tu evento
                    </label>
                    <input
                      id="eventoPersonalizado"
                      type="text"
                      value={formData.nombreEventoPersonalizado}
                      onChange={(e) => setFormData({ ...formData, nombreEventoPersonalizado: e.target.value })}
                      placeholder="Ej: Aniversario, cumpleaños de mamá..."
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="fechaEvento" className={labelClass}>
                    Fecha del evento
                  </label>
                  <input
                    id="fechaEvento"
                    type="date"
                    value={formData.fechaEvento}
                    onChange={(e) => setFormData({ ...formData, fechaEvento: e.target.value })}
                    disabled={useEventDate}
                    className={inputClass}
                  />

                  {selectedEvento && (
                    <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useEventDate}
                        onChange={(e) => handleUseEventDate(e.target.checked)}
                        className="w-4 h-4 rounded-sm accent-[#4A5D4F]"
                      />
                      <span className="text-sm text-[#2B2B28]/70">
                        Usar la fecha oficial del evento ({formatearFecha(selectedEvento.fecha)})
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 px-4 py-3 border border-[#B76E79]/40 bg-[#B76E79]/5 rounded-sm text-sm text-[#8F4A55]"
                >
                  <span className="material-icons-round text-lg leading-none mt-0.5">error_outline</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={enviandoCodigo}
                className="w-full px-6 py-4 bg-[#4A5D4F] text-white text-xs uppercase tracking-[0.3em] rounded-sm hover:bg-[#3D4E41] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviandoCodigo ? "Generando código..." : "Obtener código de reserva"}
              </button>
            </form>

            {/* Panel informativo */}
            <aside className="lg:col-span-2 lg:sticky lg:top-8 fade-up" style={{ animationDelay: "120ms" }}>
              <div className="relative bg-white/60 border border-[#E9D5D0] rounded-sm p-8 sm:p-10">
                <span className="pointer-events-none absolute inset-3 border border-[#E9D5D0]/70 rounded-sm" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#B76E79] mb-3">Cómo funciona</p>
                  <h3 className="text-3xl text-[#2B2B28] mb-8" style={{ ...serif, fontWeight: 500 }}>
                    Tres pasos sencillos
                  </h3>

                  <ol className="space-y-7">
                    {[
                      { t: "Elige tu evento", d: "Selecciona una fecha especial o crea la tuya." },
                      { t: "Recibe tu código", d: "Generamos un código único para tu reserva." },
                      { t: "Reserva tus flores", d: "Usa el código para elegir tus productos con tiempo." }
                    ].map((paso, i) => (
                      <li key={paso.t} className="flex gap-4">
                        <span className="text-3xl italic leading-none text-[#B76E79]" style={serif}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-lg text-[#2B2B28] leading-tight" style={{ ...serif, fontWeight: 600 }}>
                            {paso.t}
                          </p>
                          <p className="text-sm text-[#2B2B28]/60 mt-1">{paso.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          /* Reserva creada */
          <div className="max-w-xl mx-auto bg-white border border-[#E9D5D0] rounded-sm p-8 sm:p-12 text-center fade-up">
            <div className="w-16 h-16 rounded-full border border-[#4A5D4F]/40 bg-[#4A5D4F]/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-icons-round text-3xl text-[#4A5D4F]">check</span>
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#B76E79] mb-3">Todo listo</p>
            <h2 className="text-4xl text-[#2B2B28] mb-6" style={{ ...serif, fontWeight: 500 }}>
              ¡Reserva creada!
            </h2>
            <Ornamento />
            <p className="mt-6 text-[#4A5D4F]/80 italic text-lg" style={serif}>
              Tu código de reserva es
            </p>

            <div className="relative mt-4 px-6 py-7 bg-[#FAF7F2] border border-dashed border-[#B76E79]/50 rounded-sm">
              <span className="block text-4xl sm:text-5xl text-[#2B2B28] tracking-[0.15em] break-all" style={{ ...serif, fontWeight: 600 }}>
                {codigoGenerado}
              </span>
              <button
                onClick={handleCopiarCodigo}
                className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#4A5D4F] hover:text-[#B76E79] transition-colors"
              >
                <span className="material-icons-round text-base">{copiado ? "check" : "content_copy"}</span>
                {copiado ? "Copiado" : "Copiar código"}
              </button>
            </div>

            <p className="text-sm text-[#2B2B28]/55 mt-5">Guarda este código para usarlo al reservar tus productos.</p>

            <div className="mt-10 space-y-3">
              <Link
                href={`/reservas/seleccionar-productos?codigo=${codigoGenerado}`}
                className="block w-full px-6 py-4 bg-[#4A5D4F] text-white text-xs uppercase tracking-[0.3em] rounded-sm hover:bg-[#3D4E41] transition-colors"
              >
                Reservar productos ahora
              </Link>

              <button
                onClick={handleEnviarRecordatorio}
                disabled={enviandoRecordatorio}
                className="w-full px-6 py-4 border border-[#4A5D4F] text-[#4A5D4F] text-xs uppercase tracking-[0.3em] rounded-sm hover:bg-[#4A5D4F]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviandoRecordatorio ? "Enviando..." : "Enviarme un recordatorio"}
              </button>

              {mensajeRecordatorio && (
                <p
                  role="status"
                  className={`text-sm ${mensajeRecordatorio.tipo === "ok" ? "text-[#4A5D4F]" : "text-[#8F4A55]"}`}
                >
                  {mensajeRecordatorio.texto}
                </p>
              )}

              <button
                onClick={handleNuevaReserva}
                className="pt-3 text-xs uppercase tracking-[0.25em] text-[#2B2B28]/55 hover:text-[#B76E79] transition-colors"
              >
                Crear otra reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}