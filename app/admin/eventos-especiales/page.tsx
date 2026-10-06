"use client";

import React, { useEffect, useState } from "react";
import {
  obtenerEventosEspeciales,
  crearEventoEspecial,
  actualizarEventoEspecial,
  eliminarEventoEspecial,
  EventoEspecial
} from "../../lib/eventos-especiales-db";

export default function EventosEspecialesPage() {
  const [eventos, setEventos] = useState<EventoEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoEspecial | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: "",
    fecha: "",
    activo: true
  });

  useEffect(() => {
    loadEventos();
  }, []);

  async function loadEventos() {
    try {
      const data = await obtenerEventosEspeciales();
      setEventos(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading eventos:", error);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingEvento) {
        await actualizarEventoEspecial(
          editingEvento.id,
          formData.nombre,
          new Date(formData.fecha),
          formData.activo
        );
      } else {
        await crearEventoEspecial(formData.nombre, new Date(formData.fecha));
      }
      setShowModal(false);
      setEditingEvento(null);
      setFormData({ nombre: "", fecha: "", activo: true });
      loadEventos();
    } catch (error) {
      console.error("Error saving evento:", error);
      alert("Error al guardar el evento");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;
    try {
      await eliminarEventoEspecial(id);
      loadEventos();
    } catch (error) {
      console.error("Error deleting evento:", error);
      alert("Error al eliminar el evento");
    }
  }

  function handleEdit(evento: EventoEspecial) {
    setEditingEvento(evento);
    setFormData({
      nombre: evento.nombre,
      fecha: evento.fecha.toISOString().split('T')[0],
      activo: evento.activo
    });
    setShowModal(true);
  }

  function handleNew() {
    setEditingEvento(null);
    setFormData({ nombre: "", fecha: "", activo: true });
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Eventos Especiales</h1>
            <p className="text-gray-600 mt-2">Gestiona los eventos especiales para recordatorios y reservas</p>
          </div>
          <button
            onClick={handleNew}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            + Nuevo Evento
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-black">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-black">Fecha</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-black">Estado</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-black">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No hay eventos especiales creados
                  </td>
                </tr>
              ) : (
                eventos.map((evento) => (
                  <tr key={evento.id} className="border-t border-gray-200">
                    <td className="px-6 py-4 text-black font-medium">{evento.nombre}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {evento.fecha.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          evento.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {evento.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(evento)}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(evento.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
              <h2 className="text-2xl font-bold text-black mb-6">
                {editingEvento ? "Editar Evento" : "Nuevo Evento"}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-2">
                    Nombre del evento
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-2">
                    Fecha del evento
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-black">Evento activo</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEvento(null);
                      setFormData({ nombre: "", fecha: "", activo: true });
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-black hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    {editingEvento ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
