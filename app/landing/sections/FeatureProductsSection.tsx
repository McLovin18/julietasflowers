"use client";

import React from "react";
import type {
  LandingSectionStyles,
  LandingFieldStyle,
} from "../../lib/landing-types";
import ProductoCard from "../../components/ProductoCard";

export type FeatureProductsSectionProps = {
  title?: string;
  products?: any[];
  styles?: LandingSectionStyles;
  fieldStyles?: Record<string, LandingFieldStyle>;
  device?: "mobile" | "desktop";
};

export default function FeatureProductsSection({
  title = "Productos destacados",
  products = [],
  styles,
  fieldStyles,
}: FeatureProductsSectionProps) {
  const paddingTop = styles?.paddingTop || (typeof window !== "undefined" && window.innerWidth < 768 ? "0.5rem" : "2rem");
  const paddingBottom = styles?.paddingBottom || (typeof window !== "undefined" && window.innerWidth < 768 ? "0.5rem" : "0.5rem");

  // Filtrar productos destacados (donde destacado == true)
  const featuredProducts = React.useMemo(() => {
    return products.filter((prod: any) => prod.destacado === true);
  }, [products]);

  if (!featuredProducts.length) return null;

  return (
    <section
      style={{ 
        paddingTop, 
        paddingBottom,
        color: styles?.textColor
      }}
      className="w-full max-w-full bg-black px-2 md:px-2 flex flex-col items-center m-0 overflow-x-hidden"
    >
      {/* Título */}
      {title && (
        <h2
          className="text-3xl text-center sm:text-2xl lg:text-4xl py-2 font-extrabold tracking-tight"
          style={fieldStyles?.title || { color: styles?.textColor || "var(--text)" }}
        >
          {title}
        </h2>
      )}

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 md:px-12">
        {/* ── Grid: 1 columna en móvil, 4 en desktop ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
          {featuredProducts.map((prod: any, idx: number) => (
            <div
              key={prod.id}
              className="transition-all p-4 duration-300 flex flex-col items-stretch justify-stretch h-full"
            >
              <ProductoCard producto={prod} index={idx} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}