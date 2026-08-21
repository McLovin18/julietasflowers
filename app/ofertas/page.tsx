"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductoCard from "../components/ProductoCard";
import EmptyState from "../components/EmptyState";
import { obtenerProductos } from "../lib/productos-db";
import { getCatalogPricing } from "../lib/pricing";
import type { Producto } from "../lib/productos-db";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
  sameCategoryId,
} from "../lib/categorias-db";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function OfertasPage() {
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



  const productosOferta = useMemo(() => {
    return productos.filter((producto) => {
      const hasDiscount = getCatalogPricing(producto).hasDiscount;

      const matchCategory =
        !selectedCategoryId ||
        sameCategoryId(producto.categoria, selectedCategoryId);

      return hasDiscount && matchCategory;
    });
  }, [productos, selectedCategoryId]);

  return (
    <div className="min-h-screen transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-500">Oferta especial</p>
            <h1 className="mt-2 text-3xl font-black text-white tracking-tight sm:text-4xl">Productos con descuento</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Aquí solo aparecen los productos que tienen descuento real aplicado al precio de compra.
            </p>
          </div>
          <Link
            href="/products-by-category"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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
                  ? "shadow-sm scale-105 bg-black text-white border border-black"
                  : "bg-white text-slate-900 border border-slate-300 hover:border-black/60 hover:shadow-sm"
              }`}
            >
              Todas
            </button>

            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                  selectedCategoryId === cat.id
                    ? "shadow-sm scale-105 bg-black text-white border border-black"
                    : "bg-white text-slate-900 border border-slate-300 hover:border-black/60 hover:shadow-sm"
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>



        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/3">
            Cargando ofertas...
          </div>
        ) : productosOferta.length === 0 ? (
          <EmptyState
            icon="local_offer"
            title="No hay ofertas activas"
            message="En este momento no hay productos con descuento publicado"
          />
        ) : (
          <>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <span className="material-icons-round text-base">local_offer</span>
              {productosOferta.length} productos en oferta
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {productosOferta.map((p: any) => (
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