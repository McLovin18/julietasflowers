"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { obtenerProductos } from "../../lib/productos-db";
import ProductoCard from "../../components/ProductoCard";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";

export default function SeleccionarProductosPage() {
  const searchParams = useSearchParams();
  const reservaCodigo = searchParams.get("codigo");
  
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [reservaData, setReservaData] = useState<any>(null);
  
  const { carrito, addCarrito } = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        // Load products
        const prods = await obtenerProductos();
        setProductos(prods);
        
        // Load reservation data if code provided
        if (reservaCodigo) {
          const { obtenerReservaPorCodigo } = await import("../../lib/reservas-db");
          const reserva = await obtenerReservaPorCodigo(reservaCodigo);
          setReservaData(reserva);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    }
    loadData();
  }, [reservaCodigo]);

  function toggleProductSelection(productId: string) {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  }

  async function handleReservar() {
    if (selectedProducts.size === 0) {
      showToast("Por favor selecciona al menos un producto");
      return;
    }

    if (!reservaData) {
      showToast("No hay información de reserva");
      return;
    }

    // Add selected products to cart with reservation info
    for (const productId of selectedProducts) {
      const producto = productos.find(p => p.id === productId);
      if (producto) {
        await addCarrito({
          ...producto,
          cantidad: 1,
          reserva: {
            codigo: reservaData.codigo,
            nombreEvento: reservaData.nombreEventoPersonalizado || "Evento especial",
            fechaEvento: reservaData.fechaEvento
          }
        });
      }
    }

    showToast(`${selectedProducts.size} producto(s) añadido(s) al carrito con reserva`);
    
    // Redirect to cart with reserva filter
    window.location.href = `/cart?reserva=${reservaCodigo}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-black hover:text-gray-700 transition-colors mb-4"
          >
            <span className="material-icons-round">arrow_back</span>
            <span className="font-medium">Volver</span>
          </button>
          
          <h1 className="text-3xl font-bold text-black mb-2">Seleccionar Productos</h1>
          
          {reservaData && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Evento:</strong> {reservaData.nombreEventoPersonalizado || "Evento especial"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong> {new Date(reservaData.fechaEvento).toLocaleDateString("es-ES")}
              </p>
            </div>
          )}
          
          <p className="text-gray-600 mt-4">
            {selectedProducts.size} {selectedProducts.size === 1 ? "producto seleccionado" : "productos seleccionados"}
          </p>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {productos.map((producto) => (
            <div key={producto.id} className="relative">
              <div
                onClick={() => toggleProductSelection(producto.id)}
                className={`cursor-pointer transition-all ${
                  selectedProducts.has(producto.id) 
                    ? "ring-4 ring-black rounded-xl" 
                    : ""
                }`}
              >
                <ProductoCard producto={producto} />
              </div>
              
              {/* Selection indicator */}
              <div
                className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  selectedProducts.has(producto.id)
                    ? "bg-black text-white"
                    : "bg-white border-2 border-gray-300"
                }`}
                onClick={() => toggleProductSelection(producto.id)}
              >
                {selectedProducts.has(producto.id) && (
                  <span className="material-icons-round text-lg">check</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action button */}
        {selectedProducts.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-black font-medium">
                {selectedProducts.size} {selectedProducts.size === 1 ? "producto" : "productos"} seleccionados
              </p>
              <button
                onClick={handleReservar}
                className="px-8 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Añadir al carrito y reservar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
