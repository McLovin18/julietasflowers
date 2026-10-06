"use client";

import React, { useEffect, useState } from "react";
import { obtenerBodegas, Bodega } from "../lib/bodegas-db";
import { obtenerProductosPorBodega } from "../lib/productos-db";
import ProductoCard from "../components/ProductoCard";

const serif = { fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif" };

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

export default function ColeccionesPage() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productosPorBodega, setProductosPorBodega] = useState<Record<string, any[]>>({});
  const [selectedBodega, setSelectedBodega] = useState<Bodega | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const bodegasData = await obtenerBodegas();
        setBodegas(bodegasData);

        // Cargamos los productos de todas las colecciones en paralelo
        // para poder mostrar el conteo en cada card.
        const entradas = await Promise.all(
          bodegasData.map(async (b) => {
            try {
              const prods = await obtenerProductosPorBodega(b.id);
              return [b.id, prods] as [string, any[]];
            } catch (error) {
              console.error(`Error loading productos de ${b.nombre}:`, error);
              return [b.id, []] as [string, any[]];
            }
          })
        );
        setProductosPorBodega(Object.fromEntries(entradas));
      } catch (error) {
        console.error("Error loading bodegas:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const textoConteo = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`;

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
      <div className="min-h-screen bg-[#FAF7F2]">
        {estilos}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="h-3 w-32 bg-[#E9D5D0]/60 rounded mx-auto mb-6 animate-pulse" />
            <div className="h-10 w-64 bg-[#E9D5D0]/60 rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 bg-white/70 border border-[#E9D5D0]/70 rounded-sm animate-pulse" />
            ))}
          </div>
          <p className="mt-10 text-center text-[#4A5D4F]/70 italic" style={serif}>
            Preparando nuestras colecciones...
          </p>
        </div>
      </div>
    );
  }

  if (selectedBodega) {
    const productos = productosPorBodega[selectedBodega.id] || [];

    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        {estilos}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <button
            onClick={() => setSelectedBodega(null)}
            className="group mb-12 inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#4A5D4F] hover:text-[#B76E79] transition-colors"
          >
            <span className="material-icons-round text-base transition-transform duration-300 group-hover:-translate-x-1">
              arrow_back
            </span>
            Volver a colecciones
          </button>

          <header className="text-center mb-16 fade-up">
            <p className="text-xs uppercase tracking-[0.35em] text-[#B76E79] mb-4">Colección</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#2B2B28] mb-5" style={{ ...serif, fontWeight: 500 }}>
              {selectedBodega.nombre}
            </h1>
            <Ornamento />
            <p className="mt-5 text-[#4A5D4F]/80 italic text-lg" style={serif}>
              {textoConteo(productos.length)}
            </p>
          </header>

          {productos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {productos.map((producto, i) => (
                <div key={producto.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                  <ProductoCard producto={producto} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 fade-up">
              <p className="text-2xl text-[#4A5D4F]/80 italic" style={serif}>
                Aún no hay productos en esta colección.
              </p>
              <p className="mt-2 text-sm text-[#2B2B28]/50">Muy pronto tendremos nuevas flores para ti.</p>
            </div>
          )}
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
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 text-center fade-up">
          <p className="text-xs uppercase tracking-[0.4em] text-[#B76E79] mb-3">Nuestras colecciones</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-[#2B2B28] leading-[1.05] mb-8" style={{ ...serif, fontWeight: 500 }}>
            Flores que cuentan <span className="italic text-[#B76E79]">historias</span>
          </h1>
          <Ornamento />
          <p className=" text-lg sm:text-xl text-[#4A5D4F]/90 max-w-xl mx-auto leading-relaxed" style={serif}>
            Arreglos y detalles florales creados a mano, pensados para cada momento especial.
          </p>
        </div>
      </section>

      {/* Colecciones */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
        {bodegas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {bodegas.map((bodega, i) => {
              const total = (productosPorBodega[bodega.id] || []).length;
              return (
                <button
                  key={bodega.id}
                  onClick={() => setSelectedBodega(bodega)}
                  className="group fade-up relative text-left bg-white border border-[#E9D5D0] rounded-sm p-8 sm:p-10 min-h-[240px] flex flex-col justify-between overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[#B76E79]/60 hover:shadow-[0_18px_40px_-18px_rgba(74,93,79,0.35)]"
                  style={{ animationDelay: `${Math.min(i, 8) * 90}ms` }}
                >
                  {/* Marco interior */}
                  <span className="pointer-events-none absolute inset-3 border border-[#E9D5D0]/70 rounded-sm transition-colors duration-500 group-hover:border-[#B76E79]/30" />

                  <div className="relative">
                    {bodega.esNuevaColeccion && (
                      <span className="inline-block mb-4 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#B76E79] border border-[#B76E79]/50 rounded-full bg-[#FAF7F2]">
                        Nueva
                      </span>
                    )}
                    <h2
                      className="text-3xl text-[#2B2B28] leading-tight transition-colors duration-300 group-hover:text-[#4A5D4F]"
                      style={{ ...serif, fontWeight: 500 }}
                    >
                      {bodega.nombre}
                    </h2>

                    {/* Enumeración debajo del nombre */}
                    <p
                      className="mt-3 flex items-baseline gap-2 text-[#B76E79]/80 transition-colors duration-300 group-hover:text-[#B76E79]"
                      style={serif}
                    >
                      <span className="text-xl uppercase tracking-[0.3em]">N.º</span>
                      <span className="text-2xl italic leading-none">{String(i + 1).padStart(2, "0")}</span>
                    </p>
                  </div>

                  <div className="relative mt-10 flex items-end justify-between">
                    <div>
                      <span className="block h-px w-10 bg-[#B76E79]/60 mb-3 transition-all duration-500 group-hover:w-20" />
                      <p className="text-lg italic text-[#4A5D4F]/90" style={serif}>
                        {textoConteo(total)}
                      </p>
                    </div>
                    <span className="material-icons-round text-2xl text-[#B76E79]/60 transition-all duration-300 group-hover:text-[#B76E79] group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-2xl text-[#4A5D4F]/80 italic" style={serif}>
              Pronto habrá nuevas colecciones disponibles.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}