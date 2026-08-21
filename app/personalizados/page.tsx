"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductoCard from "../components/ProductoCard";
import EmptyState from "../components/EmptyState";
import { obtenerProductos } from "../lib/productos-db";
import type { Producto } from "../lib/productos-db";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
  sameCategoryId,
} from "../lib/categorias-db";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function PersonalizadosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchProductos() {
      setLoading(true);
      const prods = await obtenerProductos({ incluirSinStock: true });
      if (!mounted) return;
      setProductos(prods);
      setLoading(false);
    }

    fetchProductos().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const categoriasRef = collection(db, "categorias");
    const q = query(categoriasRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snapshot.docs)));
    });

    return () => unsubscribe();
  }, []);

  const productosPersonalizados = useMemo(() => {
    return productos.filter((producto) => {
      const isPersonalizado = (producto as any).personalizado === true;

      const matchCategory =
        !selectedCategoryId ||
        sameCategoryId(producto.categoria, selectedCategoryId);

      return isPersonalizado && matchCategory;
    });
  }, [productos, selectedCategoryId]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--secondary)" }}>Personalizados</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Velas Personalizadas</h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--textSecondary)" }}>
              Aquí solo aparecen los productos que puedes personalizar a tu gusto. Agrega tu toque único a cada vela.
            </p>
          </div>
          <Link
            href="/products-by-category"
            className="inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-[var(--primaryForeground)] transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Ver catálogo
            <span className="material-icons-round text-base">arrow_forward</span>
          </Link>
        </div>
        
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSelectedCategoryId("")}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                selectedCategoryId === ""
                  ? "shadow-sm scale-105 text-[var(--primaryForeground)]"
                  : "text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-sm"
              }`}
              style={selectedCategoryId === "" ? { background: "var(--primary)" } : { background: "var(--card)" }}
            >
              Todas
            </button>

            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                  selectedCategoryId === cat.id
                    ? "shadow-sm scale-105 text-[var(--primaryForeground)]"
                    : "text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-sm"
                }`}
                style={selectedCategoryId === cat.id ? { background: "var(--primary)" } : { background: "var(--card)" }}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border p-10 text-center shadow-sm" style={{ background: "var(--bgSecondary)", borderColor: "var(--border)" }}>
            Cargando productos personalizados...
          </div>
        ) : productosPersonalizados.length === 0 ? (
          <EmptyState
            icon="auto_awesome"
            title="No hay productos personalizados"
            message="En este momento no hay productos con personalización disponible"
          />
        ) : (
          <>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--secondary) 15%, white)", color: "var(--primary)" }}>
              <span className="material-icons-round text-base">auto_awesome</span>
              {productosPersonalizados.length} productos personalizables
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {productosPersonalizados.map((p: any) => (
                <ProductoCard
                  key={p.id}
                  producto={p}
                  showCart
                  showEye
                  isCompact={false}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
